import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { BookOpen, Camera, CheckCircle2, Sparkles, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({ meta: [{ title: "Как это работает — Умничка.AI" }, { name: "description", content: "7 простых шагов от задания до награды." }] }),
  component: HowItWorks,
});

const steps = [
  { i: BookOpen, t: "Выбери предмет", d: "Открой каталог и выбери нужный предмет." },
  { i: Sparkles, t: "Открой учебник", d: "Все уроки доступны — без блокировок и оплат." },
  { i: Target, t: "Реши задание", d: "Прочитай условие и попробуй сам." },
  { i: Camera, t: "Загрузи ответ", d: "Впиши ответ или сфотографируй тетрадь." },
  { i: CheckCircle2, t: "AI проверит", d: "Сразу увидишь — правильно или нет." },
  { i: Sparkles, t: "Исправь ошибки", d: "По шагам разберёшься, где ошибся." },
  { i: Trophy, t: "Получи награду", d: "Streak растёт, ачивки копятся, мама гордится." },
];

function HowItWorks() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Как это работает</h1>
        <p className="mt-2 text-muted-foreground">7 шагов от первой задачи до уверенности на уроке.</p>

        <ol className="relative mt-10 space-y-4 border-l-2 border-dashed border-primary/30 pl-6">
          {steps.map((s, i) => (
            <li key={i} className="glass relative rounded-2xl p-5 hover-lift">
              <span className="absolute -left-[34px] grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.70_0.15_230)] text-primary-foreground shadow-[var(--shadow-soft)]">
                <s.i className="h-4 w-4" />
              </span>
              <div className="text-xs font-semibold text-primary">ШАГ {i + 1}</div>
              <h3 className="mt-1 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </SiteLayout>
  );
}
