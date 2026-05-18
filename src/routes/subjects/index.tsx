import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getSubjects } from "@/lib/catalog.functions";
import { getSubjectTheme } from "@/lib/subject-theme";

export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Каталог предметов — Умничка.AI" },
      { name: "description", content: "Все предметы 3 класса: учебники, уроки и задания с AI-проверкой." },
    ],
  }),
  loader: () => getSubjects(),
  component: SubjectsPage,
});

function SubjectsPage() {
  const subjects = Route.useLoaderData();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Каталог</h1>
        <p className="mt-2 text-muted-foreground">Выбери предмет — откроются учебники и все уроки.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s: any) => {
            const theme = getSubjectTheme(s.slug);
            return (
              <Link
                key={s.slug}
                to="/subjects/$slug"
                params={{ slug: s.slug }}
                className={`block hover-lift rounded-3xl bg-gradient-to-br ${theme.gradient} p-6 ring-1 ring-inset ring-white/40`}
              >
                <div className="text-4xl">{s.icon ?? theme.emoji}</div>
                <h2 className="mt-4 text-xl font-semibold">{s.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-foreground/70">{s.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
