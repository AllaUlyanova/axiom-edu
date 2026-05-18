import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CheckCircle2, Sparkles, Zap } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Mascot } from "@/components/site/Mascot";
import { Button } from "@/components/ui/button";
import { getSubjects } from "@/lib/catalog.functions";
import { getSubjectTheme } from "@/lib/subject-theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Умничка.AI — AI-помощник по домашним заданиям для 3 класса" },
      { name: "description", content: "AI проверяет домашние задания ученика 3 класса, объясняет ошибки и тренирует на похожих задачах. Только школьные учебники." },
    ],
  }),
  loader: () => getSubjects(),
  component: Index,
});

function Index() {
  const subjects = Route.useLoaderData();
  return (
    <SiteLayout>
      <Hero />
      <SubjectsPreview subjects={subjects} />
      <Features />
      <CTA />
    </SiteLayout>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-[oklch(0.88_0.08_280)] blur-3xl animate-blob" />
        <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-[oklch(0.88_0.08_200)] blur-3xl animate-blob" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[oklch(0.92_0.10_100)] blur-3xl animate-blob" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-white/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-помощник для 3 класса
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Домашка <span className="text-gradient">с улыбкой</span><br />
            и без слёз
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Сфотографируй задание или впиши ответ — Умничка проверит, объяснит простыми словами и
            подберёт похожую задачу для тренировки. Всё на основе школьных учебников.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-2xl">
              <Link to="/check">Проверить задание <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl">
              <Link to="/subjects">Открыть учебники</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[oklch(0.62_0.16_155)]" /> Объяснения по шагам</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[oklch(0.62_0.16_155)]" /> Похожие задачи</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[oklch(0.62_0.16_155)]" /> Только программа 3 класса</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative flex items-center justify-center"
        >
          <div className="relative">
            <Mascot className="h-72 w-72 animate-float md:h-96 md:w-96" />
            <FloatingCard className="-left-8 top-4" delay={0.2}>
              <Zap className="h-4 w-4 text-primary" />
              <span>Ответ за 3 сек</span>
            </FloatingCard>
            <FloatingCard className="-right-4 top-32" delay={0.4}>
              <BookOpen className="h-4 w-4 text-[oklch(0.62_0.16_155)]" />
              <span>Учебник школы</span>
            </FloatingCard>
            <FloatingCard className="bottom-6 left-2" delay={0.6}>
              <span>✨ Правильно!</span>
            </FloatingCard>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`glass absolute flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SubjectsPreview({ subjects }: { subjects: Array<{ slug: string; name: string; description: string | null; icon: string | null }> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Предметы 3 класса</h2>
          <p className="mt-2 text-muted-foreground">Открой любой учебник — все уроки доступны.</p>
        </div>
        <Button asChild variant="ghost" className="rounded-xl">
          <Link to="/subjects">Все предметы <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s, i) => {
          const theme = getSubjectTheme(s.slug);
          return (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to="/subjects/$slug"
                params={{ slug: s.slug }}
                className={`block hover-lift rounded-3xl bg-gradient-to-br ${theme.gradient} p-6 ring-1 ring-inset ring-white/40`}
              >
                <div className="text-4xl">{s.icon ?? theme.emoji}</div>
                <h3 className="mt-4 text-xl font-semibold">{s.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/70">{s.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium">
                  Открыть <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { t: "AI-проверка фото", d: "Сфотографируй тетрадь — ИИ распознает текст и оценит ответ." },
    { t: "По шагам", d: "Объяснение простым языком, как у доброго учителя." },
    { t: "Похожая задача", d: "Сразу тренируешься на новой задаче того же типа." },
    { t: "Только программа", d: "AI отвечает только на основе школьных учебников 3 класса." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Почему это работает</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.t} className="glass rounded-2xl p-5 hover-lift">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.70_0.15_230)] text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="mt-4 font-semibold">{it.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.55_0.18_230)] p-10 text-primary-foreground md:p-14">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Готов попробовать?</h2>
        <p className="mt-2 max-w-lg text-primary-foreground/85">
          Регистрация занимает 30 секунд. Никаких карт — просто открой первый учебник.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-6 rounded-2xl">
          <Link to="/signup">Создать аккаунт</Link>
        </Button>
      </div>
    </section>
  );
}
