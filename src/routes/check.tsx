import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Upload, Sparkles, Loader2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getSubjects, getBooksForSubject } from "@/lib/catalog.functions";
import { checkHomework } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "AI-проверка домашнего задания — Умничка.AI" },
      { name: "description", content: "Сфотографируй или впиши ответ — AI проверит и объяснит." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    subject: typeof s.subject === "string" ? s.subject : undefined,
    book: typeof s.book === "string" ? s.book : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
    ex: typeof s.ex === "string" ? s.ex : undefined,
  }),
  loader: () => getSubjects(),
  component: CheckPage,
});

type Book = { id: string; title: string; page_offset: number; pages_count: number | null };

function CheckPage() {
  const subjects = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const check = useServerFn(checkHomework);
  const fetchBooks = useServerFn(getBooksForSubject);

  const [subject, setSubject] = useState(search.subject ?? subjects[0]?.slug ?? "");
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<string>(search.book ?? "");
  const [page, setPage] = useState(search.page ?? "");
  const [exercise, setExercise] = useState(search.ex ?? "");
  const [answer, setAnswer] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkHomework>> | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!subject) return;
    fetchBooks({ data: { slug: subject } }).then((bs) => {
      setBooks(bs as Book[]);
      if (!bs.find((b: Book) => b.id === bookId)) {
        setBookId(bs[0]?.id ?? "");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  const selectedBook = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);
  const hasBooks = books.length > 0;
  const maxPrinted = selectedBook?.pages_count ? selectedBook.pages_count - (selectedBook.page_offset ?? 0) : undefined;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("Файл слишком большой (макс. 4 МБ).");
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authed) {
      toast("Войди, чтобы AI запомнил твои проверки");
      navigate({ to: "/login", search: { redirect: "/check" } as never });
      return;
    }
    if (!answer.trim() && !imageDataUrl) return toast.error("Введи ответ или загрузи фото");
    if (hasBooks && !page) return toast.error("Укажи номер страницы из учебника");

    setLoading(true);
    setResult(null);
    try {
      const res = await check({
        data: {
          subjectSlug: subject,
          bookId: hasBooks ? bookId || undefined : undefined,
          printedPage: page ? Number(page) : undefined,
          exerciseNumber: exercise || undefined,
          answer: answer || "(см. фото)",
          imageDataUrl,
        },
      });
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка проверки");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Проверка домашнего задания</h1>
        <p className="mt-2 text-muted-foreground">Выбери страницу из учебника и впиши ответ — AI проверит и объяснит.</p>

        <form onSubmit={onSubmit} className="glass mt-8 grid gap-4 rounded-3xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Предмет</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Выбери" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s: { slug: string; name: string }) => (
                    <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasBooks && (
              <div>
                <Label>Учебник</Label>
                <Select value={bookId} onValueChange={setBookId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Выбери учебник" /></SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Страница учебника</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                max={maxPrinted}
                value={page}
                onChange={(e) => setPage(e.target.value)}
                placeholder="как в углу страницы"
              />
              <p className="mt-1 text-xs text-muted-foreground">Номер из колонтитула учебника (например, «4»).</p>
            </div>
            <div>
              <Label>Номер упражнения (необязательно)</Label>
              <Input
                className="mt-1.5"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="напр. 3"
              />
            </div>
          </div>

          <div>
            <Label>Твой ответ</Label>
            <Textarea
              className="mt-1.5 min-h-32"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Запиши ответ или решение..."
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Фото тетради (необязательно)
            </Label>
            <Input className="mt-1.5" type="file" accept="image/*" onChange={handleFile} />
            {imageDataUrl && (
              <img src={imageDataUrl} alt="загруженное" className="mt-2 max-h-48 rounded-xl border" />
            )}
          </div>

          <Button type="submit" size="lg" className="rounded-2xl" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI думает...</>
              : <><Sparkles className="mr-2 h-4 w-4" /> Проверить</>}
          </Button>
        </form>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass mt-6 rounded-3xl p-6"
            >
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded shimmer bg-secondary" />
                <div className="h-4 w-5/6 rounded shimmer bg-secondary" />
                <div className="h-4 w-2/3 rounded shimmer bg-secondary" />
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 overflow-hidden rounded-3xl border-2 ${result.isCorrect ? "border-[oklch(0.72_0.16_155)] bg-[oklch(0.96_0.05_155)]" : "border-[oklch(0.78_0.14_25)] bg-[oklch(0.97_0.04_25)]"}`}
            >
              <div className="p-6">
                <div className="flex items-center gap-3">
                  {result.isCorrect
                    ? <CheckCircle2 className="h-7 w-7 text-[oklch(0.50_0.16_155)]" />
                    : <XCircle className="h-7 w-7 text-[oklch(0.55_0.18_25)]" />}
                  <h2 className="text-xl font-semibold">{result.verdict}</h2>
                </div>
                <p className="mt-3 text-foreground/85">{result.explanation}</p>

                {result.steps?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">Шаги решения</h3>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                      {result.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}

                {result.hint && (
                  <p className="mt-4 rounded-xl bg-white/60 p-3 text-sm">💡 <b>Подсказка.</b> {result.hint}</p>
                )}

                {result.similar?.prompt && (
                  <div className="mt-4 rounded-xl bg-white/60 p-3 text-sm">
                    <b>Похожая задача:</b> {result.similar.prompt}
                  </div>
                )}

                {result.motivation && (
                  <p className="mt-4 text-sm font-medium text-primary">{result.motivation}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </SiteLayout>
  );
}
