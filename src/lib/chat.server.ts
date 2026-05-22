import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---- Visitor cookie token ----

function getSecret() {
  const s = process.env.CHAT_VISITOR_SECRET;
  if (!s) throw new Error("CHAT_VISITOR_SECRET is not configured");
  return s;
}

export function signVisitorToken(visitorId: string): string {
  const sig = createHmac("sha256", getSecret()).update(visitorId).digest("base64url");
  return `${visitorId}.${sig}`;
}

export function verifyVisitorToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [visitorId, sig] = token.split(".");
  if (!visitorId || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(visitorId).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return visitorId;
}

// ---- Phone normalization ----

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
    return "+7" + digits.slice(1);
  }
  if (digits.length === 10) return "+7" + digits;
  return "+" + digits;
}

// ---- Telegram ----

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendTelegram(html: string): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY || !ADMIN_CHAT_ID) {
    console.warn("[telegram] skipped: missing env");
    return;
  }
  try {
    const res = await fetch(`${TG_GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] failed ${res.status}:`, body);
    }
  } catch (err) {
    console.error("[telegram] error:", err);
  }
}

export function tgEscape(s: string): string {
  return escapeHtml(s);
}

// ---- Catalog snapshot for AI ----

type CatalogSnapshot = {
  builtAt: number;
  text: string;
};

let cached: CatalogSnapshot | null = null;
const CATALOG_TTL_MS = 5 * 60 * 1000;

export async function getCatalogSnapshot(): Promise<string> {
  if (cached && Date.now() - cached.builtAt < CATALOG_TTL_MS) return cached.text;

  const [{ data: subjects }, { data: books }, { data: lessons }] = await Promise.all([
    supabaseAdmin.from("subjects").select("id, slug, name, description").order("sort_order"),
    supabaseAdmin
      .from("books")
      .select("id, title, author, subject_id, grade, type, sort_order")
      .order("sort_order"),
    supabaseAdmin
      .from("lessons")
      .select("id, slug, number, title, summary, subject_id, book_id")
      .order("number")
      .limit(500),
  ]);

  const lines: string[] = [];
  lines.push("КАТАЛОГ ШКОЛЫ «Умничка.AI»:");
  for (const s of subjects ?? []) {
    lines.push(`\n## Предмет: ${s.name} (slug: ${s.slug})`);
    if (s.description) lines.push(s.description);
    const subjBooks = (books ?? []).filter((b) => b.subject_id === s.id);
    for (const b of subjBooks) {
      lines.push(`  • Книга: «${b.title}»${b.author ? ` — ${b.author}` : ""} (${b.grade} класс, ${b.type})`);
    }
    const subjLessons = (lessons ?? []).filter((l) => l.subject_id === s.id);
    if (subjLessons.length) {
      lines.push(`  Уроки (${subjLessons.length}):`);
      for (const l of subjLessons.slice(0, 60)) {
        lines.push(`    - Урок ${l.number}: «${l.title}» (slug: ${l.slug})${l.summary ? ` — ${l.summary}` : ""}`);
      }
      if (subjLessons.length > 60) lines.push(`    … ещё ${subjLessons.length - 60} уроков`);
    }
  }

  const text = lines.join("\n");
  cached = { builtAt: Date.now(), text };
  return text;
}

// ---- AI call ----

export type AiChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] };

export type AiToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AiResult = {
  content: string;
  toolCalls: AiToolCall[];
};

export async function callConsultantAi(history: AiChatMessage[]): Promise<AiResult> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: history,
      tools: [
        {
          type: "function",
          function: {
            name: "create_order",
            description:
              "Оформить заявку на урок, когда пользователь подтвердил выбор. Передавай slug предмета (обязательно) и при возможности slug урока.",
            parameters: {
              type: "object",
              properties: {
                subject_slug: { type: "string", description: "slug предмета из каталога" },
                lesson_slug: { type: "string", description: "slug урока, если выбран" },
                note: { type: "string", description: "короткое резюме что хочет ученик" },
              },
              required: ["subject_slug", "note"],
              additionalProperties: false,
            },
          },
        },
        {
          type: "function",
          function: {
            name: "request_operator",
            description:
              "Позвать живого оператора, если вопрос сложный, эмоциональный, выходит за рамки каталога или пользователь просит человека.",
            parameters: {
              type: "object",
              properties: {
                reason: { type: "string", description: "короткая причина эскалации" },
              },
              required: ["reason"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Слишком много запросов, попробуй через минуту.");
    if (res.status === 402) throw new Error("Закончились кредиты Lovable AI. Сообщите администратору.");
    throw new Error(`AI Gateway ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const content: string = msg.content ?? "";
  const toolCalls: AiToolCall[] = (msg.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    arguments: (() => {
      try { return JSON.parse(tc.function?.arguments ?? "{}"); } catch { return {}; }
    })(),
  }));

  return { content, toolCalls };
}

// ---- Simple in-memory rate limit ----

const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 15;

export function rateLimit(key: string): boolean {
  const now = Date.now();
  const arr = (rateBuckets.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}

export const SYSTEM_PROMPT = `Ты — заботливый консультант школы «Умничка.AI» для родителей младших школьников.

Твоя цель:
1. Понять, какой ребёнок (класс, предмет, что именно вызывает трудности).
2. Подобрать из нашего каталога подходящие предметы/уроки.
3. Объяснить простым языком, чем поможет каждый урок, кратко.
4. Когда родитель согласен — позвать инструмент create_order с slug предмета (и урока, если выбран) и коротким резюме.
5. Если вопрос сложный, эмоциональный, не про каталог, или пользователь просит человека — позвать инструмент request_operator.

Правила:
- Отвечай по-русски, тепло и коротко (1–3 предложения за ход).
- Не выдумывай уроки и предметы — только те, что есть в каталоге ниже.
- Не оформляй заявку без явного согласия пользователя.
- Не спрашивай телефон или имя — у нас уже есть.
- Не давай советов вне нашего каталога.`;
