import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Главная" },
  { to: "/subjects", label: "Предметы" },
  { to: "/check", label: "Проверка ДЗ" },
  { to: "/how-it-works", label: "Инструкция" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.70_0.15_230)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Умничка<span className="text-primary">.AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {authed ? (
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/dashboard">Кабинет</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-xl">
                  <Link to="/login">Войти</Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl">
                  <Link to="/signup">Начать бесплатно</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-xl border md:hidden"
            aria-label="Меню"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <div className="glass mt-2 rounded-2xl p-2 md:hidden">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-secondary"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t pt-2">
              {authed ? (
                <Button asChild className="flex-1 rounded-xl">
                  <Link to="/dashboard" onClick={() => setOpen(false)}>Кабинет</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="flex-1 rounded-xl">
                    <Link to="/login" onClick={() => setOpen(false)}>Войти</Link>
                  </Button>
                  <Button asChild className="flex-1 rounded-xl">
                    <Link to="/signup" onClick={() => setOpen(false)}>Начать</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
