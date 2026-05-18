import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: progress }, { data: submissions }, { data: achievements }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, streak, last_active_at").eq("id", userId).maybeSingle(),
      supabase.from("progress").select("lesson_id, status, score, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
      supabase.from("submissions").select("id, is_correct, ai_verdict, created_at, subject_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("achievements").select("code, title, description, earned_at").eq("user_id", userId).order("earned_at", { ascending: false }),
    ]);
    return {
      profile: profile ?? null,
      progress: progress ?? [],
      submissions: submissions ?? [],
      achievements: achievements ?? [],
    };
  });

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    return { isAdmin: !!data };
  });
