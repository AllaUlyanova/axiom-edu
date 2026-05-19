import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSubjectWithContent } from "@/lib/catalog.functions";
import { getSubjectTheme } from "@/lib/subject-theme";
import { BookOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/subjects/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `Предмет ${params.slug} — Умничка.AI` },
      { name: "description", content: `Учебники, уроки и задания по предмету ${params.slug} для 3 класса.` },
    ],
  }),
  loader: async ({ params }) => {
    const data = await getSubjectWithContent({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  component: SubjectPage,
});

function SubjectPage() {
  const { subject, books, lessons } = Route.useLoaderData();
  const theme = getSubjectTheme(subject.slug);

  return (
    <SiteLayout>
      <section className={`bg-gradient-to-br ${theme.gradient}`}>
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="text-5xl">{subject.icon ?? theme.emoji}</div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{subject.name}</h1>
          <p className="mt-2 max-w-2xl text-foreground/75">{subject.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-2xl font-semibold">Учебники</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b: any) => (
            <div key={b.id} className="glass rounded-2xl p-5 hover-lift">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.author}</p>
              <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs">
                {b.type === "workbook" ? "Рабочая тетрадь" : "Учебник"} · {b.grade} класс
              </span>
            </div>
          ))}
          {books.length === 0 && (
            <p className="text-sm text-muted-foreground">Учебники пока не загружены.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Все уроки</h2>
          <span className="text-sm text-muted-foreground">{lessons.length} уроков</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l: any) => (
            <Link
              key={l.id}
              to="/subjects/$slug/lessons/$lessonId"
              params={{ slug: subject.slug, lessonId: String(l.number) }}
              className="glass group flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 hover-lift"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${theme.bg} text-sm font-semibold`}>
                    {l.number}
                  </span>
                  <span className="truncate font-medium">{l.title}</span>
                </div>
                {l.summary && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{l.summary}</p>}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
          {lessons.length === 0 && (
            <p className="text-sm text-muted-foreground">Уроки появятся после загрузки администратором.</p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
