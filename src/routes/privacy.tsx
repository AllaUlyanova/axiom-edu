import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Политика конфиденциальности — Умничка.AI" }] }),
  component: () => <LegalPage title="Политика конфиденциальности" body={POLICY} />,
});

const POLICY = [
  ["Какие данные мы собираем", "Имя, email, прогресс обучения, отправленные задания и ответы AI. Мы не запрашиваем данные о здоровье, местоположении или платежах сверх необходимого."],
  ["Как используем", "Только для работы сервиса: проверки заданий, отображения прогресса и улучшения качества AI-ответов."],
  ["Хранение", "Данные хранятся на защищённых серверах с шифрованием. Доступ есть только у автора аккаунта и администраторов сервиса."],
  ["Дети", "Сервис рассчитан на учеников 3 класса. Регистрация и согласие — на родителях."],
  ["Удаление", "Удалить аккаунт и все связанные данные можно по запросу через email поддержки."],
  ["Контакты", "support@umnichka.ai"],
] as const;

function LegalPage({ title, body }: { title: string; body: ReadonlyArray<readonly [string, string]> }) {
  return (
    <SiteLayout>
      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[220px_1fr]">
        <aside className="top-24 h-fit lg:sticky">
          <h2 className="text-sm font-semibold text-muted-foreground">Разделы</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {body.map(([h]) => (
              <li key={h}>
                <a href={`#${slug(h)}`} className="text-muted-foreground hover:text-foreground">{h}</a>
              </li>
            ))}
          </ul>
        </aside>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <div className="mt-6 space-y-8">
            {body.map(([h, p]) => (
              <section key={h} id={slug(h)} className="glass rounded-2xl p-6 scroll-mt-24">
                <h2 className="text-lg font-semibold">{h}</h2>
                <p className="mt-2 text-foreground/80 leading-relaxed">{p}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
function slug(s: string) { return s.toLowerCase().replace(/[^а-яa-z0-9]+/gi, "-"); }
export { LegalPage };
