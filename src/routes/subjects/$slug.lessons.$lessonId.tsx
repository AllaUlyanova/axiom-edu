import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getLesson } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/subjects/$slug/lessons/$lessonId")({
  head: ({ params }) => ({
    meta: [
      { title: `Урок ${params.lessonId} — Умничка.AI` },
      { name: "description", content: `Урок ${params.lessonId} с заданиями и AI-проверкой.` },
    ],
  }),
  loader: async ({ params }) => {
    const data = await getLesson({ data: { subjectSlug: params.slug, lessonId: params.lessonId } });
    if (!data) throw notFound();
    return data;
  },
  component: LessonPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Урок не найден</h1>
      </div>
    </SiteLayout>
  ),
});

function LessonPage() {
  const { subject, lesson, tasks, neighbours } = Route.useLoaderData();

  if (!lesson) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-3xl font-bold">Урок не найден</h1>
          <Link to="/subjects/$slug" params={{ slug: subject.slug }} className="mt-4 inline-block text-primary underline">
            К предмету
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <Link
          to="/subjects/$slug"
          params={{ slug: subject.slug }}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {subject.name}
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Урок {lesson.number}</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{lesson.title}</h1>
            {lesson.summary && <p className="mt-2 text-muted-foreground">{lesson.summary}</p>}
          </div>
          <Button asChild className="rounded-xl">
            <Link to="/check" search={{ subject: subject.slug, lesson: String(lesson.number) } as never}>
              <Sparkles className="mr-2 h-4 w-4" /> Проверить ДЗ
            </Link>
          </Button>
        </div>

        {lesson.content_md && (
          <article className="glass prose prose-sm mt-8 max-w-none rounded-2xl p-6">
            <ReactMarkdown>{lesson.content_md}</ReactMarkdown>
          </article>
        )}

        <h2 className="mt-10 text-xl font-semibold">Задания</h2>
        <div className="mt-4 space-y-3">
          {tasks.map((t: any) => (
            <div key={t.id} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-sm font-semibold">
                  {t.number}
                </span>
                <p className="font-medium">{t.prompt}</p>
              </div>
              {t.hints && t.hints.length > 0 && (
                <details className="mt-3 text-sm text-muted-foreground">
                  <summary className="cursor-pointer">Подсказка</summary>
                  <ul className="ml-4 mt-2 list-disc">{t.hints.map((h: string, i: number) => <li key={i}>{h}</li>)}</ul>
                </details>
              )}
              <div className="mt-3">
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link to="/check" search={{ subject: subject.slug, lesson: String(lesson.number), task: String(t.number) } as never}>
                    Проверить этот ответ
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          {neighbours.prev ? (
            <Button asChild variant="ghost" className="rounded-xl">
              <Link to="/subjects/$slug/lessons/$lessonId" params={{ slug: subject.slug, lessonId: String(neighbours.prev) }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Урок {neighbours.prev}
              </Link>
            </Button>
          ) : <span />}
          {neighbours.next && (
            <Button asChild className="rounded-xl">
              <Link to="/subjects/$slug/lessons/$lessonId" params={{ slug: subject.slug, lessonId: String(neighbours.next) }}>
                Урок {neighbours.next} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
