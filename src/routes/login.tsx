import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Вход — Умничка.AI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/dashboard",
  }),
  component: Login,
});

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный email или пароль. Проверь ещё раз.";
  if (m.includes("email not confirmed")) return "Подтверди email из письма, чтобы войти.";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Слишком много попыток. Подожди минуту и попробуй снова.";
  if (m.includes("network")) return "Проблема с сетью. Проверь интернет.";
  return message || "Не удалось войти. Попробуй ещё раз.";
}

function Login() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: redirect as never });
    });
  }, [nav, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        toast.error("Заполни email и пароль");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        toast.error(translateAuthError(error.message));
        return;
      }
      if (!data.session) {
        toast.error("Не удалось создать сессию. Попробуй ещё раз.");
        return;
      }
      toast.success("С возвращением!");
      nav({ to: redirect as never });
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
        <form onSubmit={submit} className="glass w-full rounded-3xl p-8">
          <h1 className="text-2xl font-bold">С возвращением 👋</h1>
          <p className="text-sm text-muted-foreground">Войди, чтобы продолжить учиться.</p>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-6 w-full rounded-xl">
            {loading ? "Входим..." : "Войти"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link to="/signup" className="text-primary underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </section>
    </SiteLayout>
  );
}
