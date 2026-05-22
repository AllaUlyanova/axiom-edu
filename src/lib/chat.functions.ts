import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  signVisitorToken,
  verifyVisitorToken,
  normalizePhone,
  sendTelegram,
  tgEscape,
  getCatalogSnapshot,
  callConsultantAi,
  rateLimit,
  SYSTEM_PROMPT,
  type AiChatMessage,
} from "./chat.server";

const VISITOR_COOKIE = "umnichka_chat_visitor";

// ---- helpers ----

async function assertAdmin(ctxSupabase: any, userId: string) {
  const { data } = await ctxSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Доступ только для администратора");
}

async function loadConversation(conversationId: string, visitorId: string) {
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, visitor_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) throw new Error("Чат не найден");
  if (conv.visitor_id !== visitorId) throw new Error("Нет доступа к этому чату");
  return conv;
}

function siteBaseUrl(): string {
  return process.env.SITE_URL || "https://axiom-edu.lovable.app";
}

// ---- Start conversation ----

const StartSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(40),
  consent: z.literal(true),
});

export const startChatConversation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StartSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const phone = normalizePhone(data.phone);
      if (!phone) throw new Error("Неверный формат телефона");

      const { data: visitor, error: vErr } = await supabaseAdmin
        .from("chat_visitors")
        .insert({ name: data.name, phone, consent_at: new Date().toISOString() })
        .select("id")
        .single();
      if (vErr || !visitor) throw new Error(vErr?.message || "Не удалось создать визитёра");

      const { data: conv, error: cErr } = await supabaseAdmin
        .from("chat_conversations")
        .insert({ visitor_id: visitor.id })
        .select("id")
        .single();
      if (cErr || !conv) throw new Error(cErr?.message || "Не удалось создать чат");

      const greeting =
        `Здравствуйте, ${data.name}! 👋 Я помощник Умничка.AI. Расскажите, в каком классе ребёнок и с каким предметом нужна помощь — подберём подходящий урок.`;

      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: greeting,
      });

      const token = signVisitorToken(visitor.id);
      try {
        setCookie(VISITOR_COOKIE, token, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      } catch (err) {
        console.warn("[chat] setCookie failed (non-fatal):", err);
      }

      void sendTelegram(
        `🆕 <b>Новый чат на сайте</b>\n` +
          `👤 ${tgEscape(data.name)}\n` +
          `📞 <code>${tgEscape(phone)}</code>\n` +
          `🔗 ${siteBaseUrl()}/admin/chats/${conv.id}`,
      );

      return { conversationId: conv.id, visitorId: visitor.id, visitorToken: token };
    } catch (err) {
      console.error("[chat] startChatConversation failed:", err);
      throw err;
    }
  });


// ---- Get conversation (for visitor) ----

const GetConvSchema = z.object({
  conversationId: z.string().uuid(),
  visitorToken: z.string().optional(),
});

export const getChatMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GetConvSchema.parse(d))
  .handler(async ({ data }) => {
    const visitorId = resolveVisitorId(data.visitorToken);
    if (!visitorId) throw new Error("Сессия чата истекла");
    await loadConversation(data.conversationId, visitorId);
    const { data: msgs } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at");
    return { messages: msgs ?? [] };
  });

// ---- Send message ----

const SendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  visitorToken: z.string().optional(),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SendSchema.parse(d))
  .handler(async ({ data }) => {
    const visitorId = resolveVisitorId(data.visitorToken);
    if (!visitorId) throw new Error("Сессия чата истекла. Откройте чат заново.");

    if (!rateLimit(`conv:${data.conversationId}`)) {
      throw new Error("Слишком много сообщений за минуту. Подождите немного.");
    }

    const conv = await loadConversation(data.conversationId, visitorId);

    // Save user message
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: data.content,
    });
    await supabaseAdmin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    // If conversation is escalated to operator — don't auto-reply
    if (conv.status === "escalated") {
      return { assistantMessage: null, escalated: true };
    }

    // Build history for AI
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at")
      .limit(40);

    const catalog = await getCatalogSnapshot();
    const messages: AiChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + catalog },
      ...(history ?? [])
        .filter((m: any) => m.role === "user" || m.role === "assistant" || m.role === "operator")
        .map((m: any) => ({
          role: m.role === "operator" ? "assistant" : m.role,
          content: m.content,
        })),
    ];

    let ai;
    try {
      ai = await callConsultantAi(messages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка ИИ";
      const fallback = `Извините, не удалось обработать сообщение. ${msg}`;
      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: fallback,
      });
      return { assistantMessage: { role: "assistant", content: fallback }, escalated: false };
    }

    // Handle tool calls
    let createdTicketKind: string | null = null;
    let assistantText = ai.content?.trim() || "";

    for (const call of ai.toolCalls) {
      if (call.name === "create_order") {
        const args = call.arguments as { subject_slug?: string; lesson_slug?: string; note?: string };
        let subjectId: string | null = null;
        let lessonId: string | null = null;
        if (args.subject_slug) {
          const { data: subj } = await supabaseAdmin
            .from("subjects").select("id").eq("slug", args.subject_slug).maybeSingle();
          subjectId = subj?.id ?? null;
        }
        if (args.lesson_slug && subjectId) {
          const { data: lesson } = await supabaseAdmin
            .from("lessons").select("id").eq("slug", args.lesson_slug).eq("subject_id", subjectId).maybeSingle();
          lessonId = lesson?.id ?? null;
        }
        await supabaseAdmin.from("chat_tickets").insert({
          conversation_id: conv.id,
          kind: "order",
          subject_id: subjectId,
          lesson_id: lessonId,
          note: args.note ?? null,
        });
        await supabaseAdmin
          .from("chat_conversations").update({ status: "ordered" }).eq("id", conv.id);
        createdTicketKind = "order";

        const { data: vis } = await supabaseAdmin
          .from("chat_visitors").select("name, phone").eq("id", visitorId).maybeSingle();
        void sendTelegram(
          `📝 <b>Новая заявка из чата</b>\n` +
            `👤 ${tgEscape(vis?.name ?? "")}\n` +
            `📞 <code>${tgEscape(vis?.phone ?? "")}</code>\n` +
            `📚 ${tgEscape(args.subject_slug ?? "—")}${args.lesson_slug ? " / " + tgEscape(args.lesson_slug) : ""}\n` +
            `💬 ${tgEscape((args.note ?? "").slice(0, 300))}\n` +
            `🔗 ${siteBaseUrl()}/admin/chats/${conv.id}`,
        );

        if (!assistantText) assistantText = "Заявка оформлена! Скоро мы свяжемся с вами. 🎉";
      } else if (call.name === "request_operator") {
        const args = call.arguments as { reason?: string };
        await supabaseAdmin.from("chat_tickets").insert({
          conversation_id: conv.id,
          kind: "operator_request",
          note: args.reason ?? null,
        });
        await supabaseAdmin
          .from("chat_conversations").update({ status: "escalated" }).eq("id", conv.id);
        createdTicketKind = "operator_request";

        const { data: vis } = await supabaseAdmin
          .from("chat_visitors").select("name, phone").eq("id", visitorId).maybeSingle();
        void sendTelegram(
          `🆘 <b>Нужен живой оператор</b>\n` +
            `👤 ${tgEscape(vis?.name ?? "")}\n` +
            `📞 <code>${tgEscape(vis?.phone ?? "")}</code>\n` +
            `💬 ${tgEscape((args.reason ?? "").slice(0, 300))}\n` +
            `🔗 ${siteBaseUrl()}/admin/chats/${conv.id}`,
        );

        if (!assistantText) {
          assistantText = "Передаю вас живому оператору, он скоро подключится сюда.";
        }
      }
    }

    if (!assistantText) assistantText = "…";

    const { data: saved } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        conversation_id: conv.id,
        role: "assistant",
        content: assistantText,
      })
      .select("id, role, content, created_at")
      .single();

    return { assistantMessage: saved, escalated: createdTicketKind === "operator_request" };
  });

// ---- Manual operator request ----

const OperatorSchema = z.object({
  conversationId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
  visitorToken: z.string().optional(),
});

export const requestOperator = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OperatorSchema.parse(d))
  .handler(async ({ data }) => {
    const visitorId = resolveVisitorId(data.visitorToken);
    if (!visitorId) throw new Error("Сессия чата истекла");
    const conv = await loadConversation(data.conversationId, visitorId);

    await supabaseAdmin.from("chat_tickets").insert({
      conversation_id: conv.id,
      kind: "operator_request",
      note: data.note ?? "Пользователь нажал кнопку «Позвать оператора»",
    });
    await supabaseAdmin
      .from("chat_conversations").update({ status: "escalated" }).eq("id", conv.id);
    const sysMsg =
      "Запрос оператора отправлен. Живой консультант ответит здесь в ближайшее время.";
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "system",
      content: sysMsg,
    });

    const { data: vis } = await supabaseAdmin
      .from("chat_visitors").select("name, phone").eq("id", visitorId).maybeSingle();
    void sendTelegram(
      `🆘 <b>Запрос оператора (кнопка)</b>\n` +
        `👤 ${tgEscape(vis?.name ?? "")}\n` +
        `📞 <code>${tgEscape(vis?.phone ?? "")}</code>\n` +
        `💬 ${tgEscape((data.note ?? "").slice(0, 300))}\n` +
        `🔗 ${siteBaseUrl()}/admin/chats/${conv.id}`,
    );

    return { ok: true, systemMessage: sysMsg };
  });

// ---- Manual order ----

const ManualOrderSchema = z.object({
  conversationId: z.string().uuid(),
  note: z.string().trim().min(1).max(500),
  visitorToken: z.string().optional(),
});

export const submitChatOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ManualOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const visitorId = resolveVisitorId(data.visitorToken);
    if (!visitorId) throw new Error("Сессия чата истекла");
    const conv = await loadConversation(data.conversationId, visitorId);

    await supabaseAdmin.from("chat_tickets").insert({
      conversation_id: conv.id,
      kind: "order",
      note: data.note,
    });
    await supabaseAdmin
      .from("chat_conversations").update({ status: "ordered" }).eq("id", conv.id);
    const sysMsg = "Заявка оформлена! Скоро мы свяжемся с вами. 🎉";
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id,
      role: "system",
      content: sysMsg,
    });

    const { data: vis } = await supabaseAdmin
      .from("chat_visitors").select("name, phone").eq("id", visitorId).maybeSingle();
    void sendTelegram(
      `📝 <b>Заявка из чата (кнопка)</b>\n` +
        `👤 ${tgEscape(vis?.name ?? "")}\n` +
        `📞 <code>${tgEscape(vis?.phone ?? "")}</code>\n` +
        `💬 ${tgEscape(data.note.slice(0, 300))}\n` +
        `🔗 ${siteBaseUrl()}/admin/chats/${conv.id}`,
    );

    return { ok: true, systemMessage: sysMsg };
  });

// ---- Admin: list conversations ----

export const adminListChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: convs } = await supabaseAdmin
      .from("chat_conversations")
      .select("id, status, last_message_at, created_at, visitor_id")
      .order("last_message_at", { ascending: false })
      .limit(200);
    const visitorIds = [...new Set((convs ?? []).map((c) => c.visitor_id))];
    const convIds = (convs ?? []).map((c) => c.id);
    const [{ data: visitors }, { data: tickets }, { data: lastMsgs }] = await Promise.all([
      supabaseAdmin.from("chat_visitors").select("id, name, phone").in("id", visitorIds.length ? visitorIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("chat_tickets").select("id, conversation_id, kind, status").in("conversation_id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("chat_messages").select("conversation_id, role, content, created_at").in("conversation_id", convIds.length ? convIds : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(400),
    ]);
    const vMap = new Map((visitors ?? []).map((v) => [v.id, v]));
    const tMap = new Map<string, typeof tickets>();
    for (const t of tickets ?? []) {
      const arr = tMap.get(t.conversation_id) ?? [];
      arr.push(t);
      tMap.set(t.conversation_id, arr);
    }
    const lastByConv = new Map<string, { role: string; content: string }>();
    for (const m of lastMsgs ?? []) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, { role: m.role, content: m.content });
      }
    }
    return (convs ?? []).map((c) => ({
      id: c.id,
      status: c.status,
      last_message_at: c.last_message_at,
      created_at: c.created_at,
      visitor: vMap.get(c.visitor_id) ?? null,
      tickets: tMap.get(c.id) ?? [],
      last_message: lastByConv.get(c.id) ?? null,
    }));
  });

// ---- Admin: get one chat ----

export const adminGetChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: conv } = await supabaseAdmin
      .from("chat_conversations").select("*").eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Чат не найден");
    const [{ data: visitor }, { data: messages }, { data: tickets }] = await Promise.all([
      supabaseAdmin.from("chat_visitors").select("*").eq("id", conv.visitor_id).maybeSingle(),
      supabaseAdmin.from("chat_messages").select("*").eq("conversation_id", conv.id).order("created_at"),
      supabaseAdmin.from("chat_tickets").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }),
    ]);
    return { conversation: conv, visitor, messages: messages ?? [], tickets: tickets ?? [] };
  });

// ---- Admin: send operator reply ----

const OpReplySchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

export const adminSendOperatorMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OpReplySchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: data.conversationId,
      role: "operator",
      content: data.content,
    });
    await supabaseAdmin
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "escalated" })
      .eq("id", data.conversationId);
    return { ok: true };
  });

// ---- Admin: update ticket status ----

const TicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["new", "in_progress", "done"]),
});

export const adminUpdateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TicketStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("chat_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
