import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getDashboard, checkAdmin } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, ArrowRight, Sparkles, Shield, LogOut } from "lucide-react";
import { adminMakeMeAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Кабинет — Умничка.AI" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: "/dashboard" } as never });
  },
  component: Dashboard,
});

function Dashboard() {
  const fetchDash = useServerFn(getDashboard);
  const fetchAdmin = useServerFn(checkAdmin);
  const promote = useServerFn(adminMakeMeAdmin);

  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { data: admin } = useQuery({ queryKey: ["isAdmin"], queryFn: () => fetchAdmin() });

  if (!data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="glass h-32 animate-pulse rounded-3xl" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Привет, {data.profile?.display_name ?? "друг"} 👋
            </h1>
            <p className="text-muted-foreground">Сегодня отличный день, чтобы стать чуточку умнее.</p>
          </div>
          <Button variant="ghost" className="rounded-xl" onClick={() => supabase.auth.signOut().then(() => location.assign("/"))}>
            <LogOut className="mr-2 h-4 w-4" /> Выйти
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat icon={Flame} label="Серия дней" value={data.profile?.streak ?? 0} tint="from-[oklch(0.93_0.08_50)] to-[oklch(0.92_0.08_25)]" />
          <Stat icon={Sparkles} label="Проверок AI" value={data.submissions.length} tint="from-[oklch(0.93_0.06_280)] to-[oklch(0.93_0.06_230)]" />
          <Stat icon={Trophy} label="Достижений" value={data.achievements.length} tint="from-[oklch(0.93_0.07_155)] to-[oklch(0.92_0.08_100)]" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="glass rounded-3xl p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold">Последние проверки</h2>
            {data.submissions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Пока ничего нет — попробуй проверить первое задание.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {data.submissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{s.ai_verdict}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("ru")}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.is_correct ? "bg-[oklch(0.92_0.08_155)]" : "bg-[oklch(0.95_0.05_25)]"}`}>
                      {s.is_correct ? "верно" : "ошибка"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/check">Проверить новое задание <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Быстро к учёбе</h2>
              <div className="mt-3 grid gap-2">
                <Button asChild variant="outline" className="justify-between rounded-xl">
                  <Link to="/subjects">Каталог предметов <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline" className="justify-between rounded-xl">
                  <Link to="/how-it-works">Как это работает <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="text-lg font-semibold">Админ</h2>
              {admin?.isAdmin ? (
                <Button asChild className="mt-3 w-full rounded-xl">
                  <Link to="/admin">Открыть админку <Shield className="ml-2 h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">Стать первым админом (только если ещё никто не назначен).</p>
                  <Button
                    variant="outline"
                    className="mt-3 w-full rounded-xl"
                    onClick={() => promote().then(() => {
                      toast.success("Ты теперь админ");
                      location.reload();
                    }).catch((e) => toast.error(e.message))}
                  >
                    Сделать меня админом
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: typeof Flame; label: string; value: number; tint: string }) {
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tint} p-6 hover-lift`}>
      <Icon className="h-5 w-5 text-foreground/70" />
      <div className="mt-3 text-4xl font-bold">{value}</div>
      <div className="text-sm text-foreground/70">{label}</div>
    </div>
  );
}
