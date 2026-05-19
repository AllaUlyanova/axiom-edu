import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Регистрация — Умничка.AI" }] }),
  component: Signup,
});

function translateSignupError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
    return "Аккаунт с таким email уже есть. Войди в систему.";
  if (m.includes("password") && (m.includes("short") || m.includes("at least") || m.includes("6")))
    return "Пароль слишком короткий — минимум 6 символов.";
  if (m.includes("invalid") && m.includes("email")) return "Неверный формат email.";
  if (m.includes("rate") || m.includes("too many")) return "Слишком много попыток. Подожди минуту.";
  return message || "Не удалось создать аккаунт. Попробуй ещё раз.";
}

function Signup() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      if (password.length < 6) {
        toast.error("Пароль должен быть не короче 6 символов");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { display_name: trimmedName || normalizedEmail.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(translateSignupError(error.message));
        return;
      }
      if (data.session) {
        toast.success("Аккаунт создан! Добро пожаловать 🎉");
        nav({ to: "/dashboard" });
      } else {
        toast.success("Аккаунт создан! Подтверди email и войди.");
        nav({ to: "/login", search: { redirect: "/dashboard" } as never });
      }
    } catch (err) {
      toast.error(translateSignupError(err instanceof Error ? err.message : ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
        <form onSubmit={submit} className="glass w-full rounded-3xl p-8">
          <h1 className="text-2xl font-bold">Привет, юный учёный! 🚀</h1>
          <p className="text-sm text-muted-foreground">Создай аккаунт за 30 секунд.</p>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Как тебя зовут?</Label>
              <Input
                className="mt-1.5"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Маша"
              />
            </div>
            <div>
              <Label>Email родителя</Label>
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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Минимум 6 символов</p>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-6 w-full rounded-xl">
            {loading ? "Создаём..." : "Создать аккаунт"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-primary underline">
              Войти
            </Link>
          </p>
        </form>
      </section>
    </SiteLayout>
  );
}
