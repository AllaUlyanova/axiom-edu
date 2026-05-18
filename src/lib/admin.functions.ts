import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(ctxSupabase: any, userId: string) {
  const { data } = await ctxSupabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Доступ только для администратора");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [subjects, books, lessons, tasks, users, submissions] = await Promise.all([
      supabaseAdmin.from("subjects").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("books").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("lessons").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tasks").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("submissions").select("id", { count: "exact", head: true }),
    ]);
    return {
      subjects: subjects.count ?? 0,
      books: books.count ?? 0,
      lessons: lessons.count ?? 0,
      tasks: tasks.count ?? 0,
      users: users.count ?? 0,
      submissions: submissions.count ?? 0,
    };
  });

export const adminListSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin.from("subjects").select("*").order("sort_order");
    return data ?? [];
  });

export const adminListLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("lessons")
      .select("id, number, title, summary, subject_id, book_id, subjects(name)")
      .order("number")
      .limit(500);
    return data ?? [];
  });

const SubjectSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const adminUpsertSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubjectSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("subjects").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const LessonSchema = z.object({
  id: z.string().uuid().optional(),
  subject_id: z.string().uuid(),
  book_id: z.string().uuid(),
  number: z.coerce.number().int().positive(),
  slug: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().nullable(),
  content_md: z.string().max(20000).optional().nullable(),
});

export const adminUpsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LessonSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("lessons").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminMakeMeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // First-user bootstrap: if no admin exists yet, promote the caller.
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Администратор уже существует.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
