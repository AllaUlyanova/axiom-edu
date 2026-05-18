import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getSubjects } from "@/lib/catalog.functions";
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
    lesson: typeof s.lesson === "string" ? s.lesson : undefined,
    task: typeof s.task === "string" ? s.task : undefined,
  }),
  loader: () => getSubjects(),
  component: CheckPage,
});

function CheckPage() {
  const subjects = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const check = useServerFn(checkHomework);

  const [subject, setSubject] = useState(search.subject ?? subjects[0]?.slug ?? "");
  const [lesson, setLesson] = useState(search.lesson ?? "");
  const [task, setTask] = useState(search.task ?? "");
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
    setLoading(true);
    setResult(null);
    try {
      const res = await check({
        data: {
          subjectSlug: subject,
          lessonNumber: lesson ? Number(lesson) : undefined,
          taskNumber: task ? Number(task) : undefined,
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
        <p className="mt-2 text-muted-foreground">AI проверит ответ, объяснит ошибки и даст похожую задачу.</p>

        <form onSubmit={onSubmit} className="glass mt-8 grid gap-4 rounded-3xl p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Предмет</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Выбери" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Номер урока</Label>
              <Input className="mt-1.5" type="number" min={1} value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="напр. 5" />
            </div>
            <div>
              <Label>Номер задания</Label>
              <Input className="mt-1.5" type="number" min={1} value={task} onChange={(e) => setTask(e.target.value)} placeholder="напр. 2" />
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
