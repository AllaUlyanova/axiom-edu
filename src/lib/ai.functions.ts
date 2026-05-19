import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  subjectSlug: z.string().min(1),
  lessonNumber: z.coerce.number().int().positive().optional(),
  taskNumber: z.coerce.number().int().positive().optional(),
  answer: z.string().min(1).max(4000),
  imageDataUrl: z.string().optional(),
});

type AICheck = {
  isCorrect: boolean;
  verdict: string;
  explanation: string;
  steps: string[];
  hint: string;
  similar: { prompt: string; answer: string };
  motivation: string;
};

async function callLovableAI(messages: Array<{ role: string; content: unknown }>): Promise<AICheck> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY не настроен");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Слишком много запросов — попробуй через минуту.");
  if (res.status === 402) throw new Error("Закончились AI-кредиты. Пополни в настройках workspace.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI ошибка: ${res.status} ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: AICheck;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {
      isCorrect: false,
      verdict: "Не удалось распознать ответ",
      explanation: content,
      steps: [],
      hint: "",
      similar: { prompt: "", answer: "" },
      motivation: "Попробуй ещё раз!",
    };
  }
  return parsed;
}

export const checkHomework = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: subject } = await supabaseAdmin
      .from("subjects").select("id, name, slug").eq("slug", data.subjectSlug).maybeSingle();

    let lesson: { id: string; number: number; title: string; content_md: string | null; book_id: string | null; page_from: number | null; page_to: number | null } | null = null;
    let task: { id: string; number: number; prompt: string; answer: string | null; solution_md: string | null } | null = null;
    let pageImages: string[] = [];
    let ocrSnippet = "";

    if (subject && data.lessonNumber) {
      const { data: l } = await supabaseAdmin
        .from("lessons")
        .select("id, number, title, content_md, book_id, page_from, page_to")
        .eq("subject_id", subject.id)
        .eq("number", data.lessonNumber)
        .maybeSingle();
      lesson = l;
      if (l && data.taskNumber) {
        const { data: t } = await supabaseAdmin
          .from("tasks").select("id, number, prompt, answer, solution_md")
          .eq("lesson_id", l.id).eq("number", data.taskNumber).maybeSingle();
        task = t;
      }
      if (l?.book_id && l.page_from) {
        const { data: pages } = await supabaseAdmin
          .from("book_pages")
          .select("page_number, image_url, ocr_text")
          .eq("book_id", l.book_id)
          .gte("page_number", l.page_from)
          .lte("page_number", l.page_to ?? l.page_from)
          .order("page_number");
        pageImages = (pages ?? []).map((p) => p.image_url);
        ocrSnippet = (pages ?? []).map((p) => `[с.${p.page_number}]\n${(p.ocr_text ?? "").slice(0, 1500)}`).join("\n\n");
      }
    }

    const ctxText = [
      subject ? `Предмет: ${subject.name}` : null,
      lesson ? `Урок ${lesson.number}: ${lesson.title}` : null,
      ocrSnippet ? `ТЕКСТ СТРАНИЦ УЧЕБНИКА (распознано с фото, могут быть мелкие ошибки OCR):\n${ocrSnippet}` : null,
      task ? `Задание №${task.number}: ${task.prompt}\nЭталонный ответ: ${task.answer ?? "—"}\nРешение: ${task.solution_md ?? "—"}` : null,
    ].filter(Boolean).join("\n\n");

    const system = `Ты — добрый учитель для ребёнка 3 класса (Россия). Проверяй ответ ТОЛЬКО на основе материала учебника (страницы и текст ниже). Если задания нет в материале — честно скажи: "Я не нашёл это задание в учебнике". Объясняй простыми словами, по шагам, дружелюбно.

Верни СТРОГО JSON:
{
  "isCorrect": boolean,
  "verdict": "коротко одной фразой",
  "explanation": "2–4 предложения простыми словами",
  "steps": ["шаг 1", "шаг 2"],
  "hint": "подсказка, если ошибка",
  "similar": { "prompt": "похожая задача", "answer": "ответ" },
  "motivation": "короткая поддержка"
}`;

    const userParts: Array<Record<string, unknown>> = [
      { type: "text", text: `КОНТЕКСТ ИЗ УЧЕБНИКА:\n${ctxText || "(материал не загружен)"}\n\nОТВЕТ УЧЕНИКА:\n${data.answer}` },
    ];
    // attach textbook page images (up to 2)
    for (const url of pageImages.slice(0, 2)) {
      userParts.push({ type: "image_url", image_url: { url } });
    }
    if (pageImages.length > 0) {
      userParts.push({ type: "text", text: "Выше — фото страниц учебника. Найди на них нужное задание." });
    }
    if (data.imageDataUrl) {
      userParts.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
      userParts.push({ type: "text", text: "А это фото тетради ученика. Распознай его и проверь решение." });
    }

    const result = await callLovableAI([
      { role: "system", content: system },
      { role: "user", content: userParts },
    ]);

    await supabase.from("submissions").insert({
      user_id: userId,
      task_id: task?.id ?? null,
      lesson_id: lesson?.id ?? null,
      subject_id: subject?.id ?? null,
      answer_text: data.answer,
      image_url: data.imageDataUrl ? "uploaded" : null,
      is_correct: result.isCorrect,
      ai_verdict: result.verdict,
      ai_explanation: result.explanation,
      ai_steps: result.steps as unknown as never,
      ai_hint: result.hint,
      ai_similar: result.similar as unknown as never,
    });

    return result;
  });
