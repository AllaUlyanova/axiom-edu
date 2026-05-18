import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-[oklch(0.99_0.005_90)]/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.70_0.15_230)] text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold">Умничка.AI</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            AI-сервис для учеников 3 класса: проверка домашних заданий, объяснения и тренировки —
            всё на основе школьных учебников.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Продукт</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/subjects" className="hover:text-foreground">Предметы</Link></li>
            <li><Link to="/check" className="hover:text-foreground">Проверка ДЗ</Link></li>
            <li><Link to="/how-it-works" className="hover:text-foreground">Как это работает</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Документы</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Политика конфиденциальности</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Пользовательское соглашение</Link></li>
            <li><Link to="/offer" className="hover:text-foreground">Публичная оферта</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Умничка.AI — обучение на новом уровне</span>
          <span>Сделано с ❤️ для учеников 3 класса</span>
        </div>
      </div>
    </footer>
  );
}
