import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSubjects = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, slug, name, icon, color, description, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSubjectWithContent = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: subject, error } = await supabaseAdmin
      .from("subjects")
      .select("id, slug, name, description, icon, color")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!subject) return null;

    const [{ data: books }, { data: lessons }] = await Promise.all([
      supabaseAdmin
        .from("books")
        .select("id, title, author, cover_url, type, grade, sort_order")
        .eq("subject_id", subject.id)
        .order("sort_order"),
      supabaseAdmin
        .from("lessons")
        .select("id, number, slug, title, summary, book_id")
        .eq("subject_id", subject.id)
        .order("number", { ascending: true }),
    ]);

    return { subject, books: books ?? [], lessons: lessons ?? [] };
  });

export const getLesson = createServerFn({ method: "GET" })
  .inputValidator((d: { subjectSlug: string; lessonId: string }) => d)
  .handler(async ({ data }) => {
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("id, slug, name")
      .eq("slug", data.subjectSlug)
      .maybeSingle();
    if (!subject) return null;

    // lessonId can be a number or a slug
    const isNumeric = /^\d+$/.test(data.lessonId);
    const query = supabaseAdmin
      .from("lessons")
      .select("id, number, slug, title, summary, content_md, book_id, subject_id")
      .eq("subject_id", subject.id);

    const { data: lesson, error } = isNumeric
      ? await query.eq("number", Number(data.lessonId)).maybeSingle()
      : await query.eq("slug", data.lessonId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) return { subject, lesson: null, tasks: [], neighbours: { prev: null, next: null } };

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, number, prompt, answer, hints, solution_md, difficulty")
      .eq("lesson_id", lesson.id)
      .order("number");

    const { data: all } = await supabaseAdmin
      .from("lessons")
      .select("number")
      .eq("subject_id", subject.id)
      .order("number");
    const nums = (all ?? []).map((l) => l.number);
    const idx = nums.indexOf(lesson.number);
    const neighbours = {
      prev: idx > 0 ? nums[idx - 1] : null,
      next: idx >= 0 && idx < nums.length - 1 ? nums[idx + 1] : null,
    };

    return { subject, lesson, tasks: tasks ?? [], neighbours };
  });
