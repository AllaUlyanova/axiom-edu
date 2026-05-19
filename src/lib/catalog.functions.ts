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
        .select("id, title, author, cover_url, type, grade, sort_order, page_offset, pages_count")
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

    const isNumeric = /^\d+$/.test(data.lessonId);
    const query = supabaseAdmin
      .from("lessons")
      .select("id, number, slug, title, summary, content_md, book_id, subject_id, page_from, page_to")
      .eq("subject_id", subject.id);

    const { data: lesson, error } = isNumeric
      ? await query.eq("number", Number(data.lessonId)).maybeSingle()
      : await query.eq("slug", data.lessonId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) return { subject, lesson: null, tasks: [], pages: [], book: null, neighbours: { prev: null, next: null } };

    const [tasksRes, allRes, bookRes, pagesRes] = await Promise.all([
      supabaseAdmin.from("tasks").select("id, number, prompt, answer, hints, solution_md, difficulty, page_number").eq("lesson_id", lesson.id).order("number"),
      supabaseAdmin.from("lessons").select("number").eq("subject_id", subject.id).order("number"),
      lesson.book_id ? supabaseAdmin.from("books").select("id, title, page_offset").eq("id", lesson.book_id).maybeSingle() : Promise.resolve({ data: null }),
      lesson.book_id && lesson.page_from
        ? supabaseAdmin
            .from("book_pages")
            .select("page_number, image_url")
            .eq("book_id", lesson.book_id)
            .gte("page_number", lesson.page_from)
            .lte("page_number", lesson.page_to ?? lesson.page_from)
            .order("page_number")
        : Promise.resolve({ data: [] }),
    ]);

    const nums = (allRes.data ?? []).map((l) => l.number);
    const idx = nums.indexOf(lesson.number);
    return {
      subject,
      lesson,
      tasks: tasksRes.data ?? [],
      pages: pagesRes.data ?? [],
      book: bookRes.data ?? null,
      neighbours: {
        prev: idx > 0 ? nums[idx - 1] : null,
        next: idx >= 0 && idx < nums.length - 1 ? nums[idx + 1] : null,
      },
    };
  });
