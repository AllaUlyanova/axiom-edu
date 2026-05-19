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

function Signup() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      toast.success("Аккаунт создан! Добро пожаловать 🎉");
      nav({ to: "/dashboard" });
    } else {
      toast.success("Аккаунт создан! Проверь почту и подтверди email, затем войди.");
      nav({ to: "/login", search: { redirect: "/dashboard" } as never });
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
              <Input className="mt-1.5" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Маша" />
            </div>
            <div>
              <Label>Email родителя</Label>
              <Input className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input className="mt-1.5" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-6 w-full rounded-xl">
            {loading ? "Создаём..." : "Создать аккаунт"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт? <Link to="/login" className="text-primary underline">Войти</Link>
          </p>
        </form>
      </section>
    </SiteLayout>
  );
}
