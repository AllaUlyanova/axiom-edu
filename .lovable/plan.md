## Что строим

Premium EdTech-платформа для учеников 3 класса РФ с AI-проверкой ДЗ. Полный MVP с backend (Lovable Cloud), AI (Lovable AI Gateway), всеми страницами, динамическими уроками без хардкода и админкой.

Стек: TanStack Start + React 19 + Tailwind v4 + shadcn + Framer Motion + Lovable Cloud (Supabase) + Lovable AI.

---

## Дизайн-система

Светлая premium тема, glassmorphism, pastel:
- Фон: тёплый off-white `oklch(0.99 0.005 90)`
- Primary: мягкий индиго `oklch(0.62 0.18 270)`
- Accent pastels: мята, персик, лаванда, нежно-голубой (по предметам)
- Тонкие тени, blur backdrops, плавные градиенты
- Шрифты: Inter (UI) + Manrope (заголовки), крупные радиусы (16–24px)
- Анимации: Framer Motion — fade/slide-up, hover-lift, shimmer, AI typing
- Mascot: дружелюбный AI-персонаж (генерация через imagegen)

---

## Структура маршрутов (TanStack file-based)

Публичные:
- `/` — Лендинг (hero, как работает, предметы preview, CTA)
- `/subjects` — Каталог предметов
- `/subjects/$slug` — Страница предмета (учебники, тетради, уроки)
- `/subjects/$slug/lessons/$lessonId` — Страница урока (динамически, ВСЕ уроки)
- `/check` — AI-проверка ДЗ (форма + результат)
- `/how-it-works` — Инструкция (timeline)
- `/privacy` — Политика конфиденциальности
- `/terms` — Пользовательское соглашение
- `/offer` — Публичная оферта
- `/login`, `/signup`, `/reset-password`

Защищённые (`_authenticated/`):
- `/dashboard` — Дашборд ученика (задания, прогресс, streak, достижения)
- `/profile` — Профиль

Админ (`_authenticated/_admin/`):
- `/admin` — Обзор + статистика
- `/admin/subjects`, `/admin/books`, `/admin/workbooks`, `/admin/lessons`, `/admin/tasks`, `/admin/users`

---

## Схема БД (Lovable Cloud)

```text
subjects(id, slug, name, icon, color, description, order)
books(id, subject_id, title, author, cover_url, pdf_url, type[textbook|workbook], grade)
lessons(id, book_id, subject_id, number, slug, title, summary, content_md, order)
tasks(id, lesson_id, number, prompt, answer, hints[], solution_md, difficulty)
profiles(id→auth.users, display_name, avatar_url, grade, streak, last_active_at)
user_roles(id, user_id, role[admin|student])  -- отдельная таблица, has_role()
progress(id, user_id, lesson_id, status, score, completed_at)
submissions(id, user_id, task_id, answer_text, image_url, ai_verdict, ai_explanation, ai_steps, is_correct, created_at)
achievements(id, user_id, code, title, earned_at)
embeddings(id, source_type, source_id, chunk_text, embedding vector(1536))  -- pgvector
```

RLS: students видят/пишут только своё; admins (через `has_role`) — всё. Storage buckets: `book-covers` (public), `book-pdfs` (private), `homework-uploads` (private per user).

Seed: ~3 предмета × 1 учебник × 20+ уроков с задачами — чтобы реально работали ВСЕ уроки без хардкода (генерация через скрипт + AI).

---

## AI-архитектура

Server functions (`createServerFn`) через Lovable AI Gateway:

1. **`checkHomework`** — принимает subject/book/lesson/task/answer/image. Делает:
   - OCR изображения (Gemini multimodal)
   - RAG: эмбеддинг запроса → pgvector поиск чанков урока/учебника → контекст
   - Structured output: `{ isCorrect, verdict, explanation, steps[], hint, similarTask }`
   - Системный промпт: «отвечай только на основе материала; если нет — скажи "Я не нашёл это в учебнике"»

2. **`generateSimilarTask`** — на основе текущей задачи + контекста урока.

3. **`tutorChat`** — стриминговый AI-помощник (generator + `yield`), привязанный к уроку.

4. **`ingestBook`** (admin) — парсинг PDF → чанки → embeddings (gemini-embedding-001) → `embeddings` таблица.

Скрипт-сидер для демо-контента: запускается локально через `code--exec` + Lovable AI, наполняет 3 предмета реалистичными уроками 3 класса РФ.

---

## Ключевые UI-компоненты

- `<GlassCard>`, `<GradientHero>`, `<SubjectTile>` (pastel по предмету), `<LessonCard>` с progress ring, `<AIResultCard>` (правильно/ошибка + steps + hint + similar), `<AITypingBubble>` (shimmer), `<StreakBadge>`, `<MascotFloater>`, `<Header>` (sticky glass + mobile sheet), `<Footer>`.

---

## Решение проблемы «открываются только уроки 5/12/20/35»

Уроки рендерятся из БД через **dynamic route** `/subjects/$slug/lessons/$lessonId`. Список уроков на странице предмета — `.map()` по `lessons` из БД. Никаких switch/if по номерам. Loader делает один `select` — все уроки автоматически доступны и кликабельны. Seed гарантирует, что у каждого предмета есть полный набор уроков.

---

## Auth

Email/password + Google (через Lovable broker). Профиль создаётся триггером on signup. Роль `admin` назначается вручную в БД первому пользователю. `_authenticated` layout гейтит приватные роуты, `_admin` проверяет `has_role(uid, 'admin')`.

---

## План работ (итерациями)

1. **Фундамент**: дизайн-токены в `styles.css`, базовые UI-компоненты (GlassCard, Header, Footer, Mascot), лендинг с hero.
2. **Lovable Cloud + схема**: миграции (subjects/books/lessons/tasks/profiles/user_roles/progress/submissions/achievements/embeddings), RLS, storage buckets, триггер профиля, `has_role()`.
3. **Auth**: login/signup/reset, `_authenticated` layout, профиль.
4. **Каталог + предметы + уроки**: страницы `/subjects`, `/subjects/$slug`, `/subjects/$slug/lessons/$lessonId` — полностью динамические. Seed-скрипт с демо-контентом.
5. **Dashboard ученика**: задания, прогресс, streak, достижения, рекомендации.
6. **AI-проверка ДЗ**: форма `/check`, server fn `checkHomework`, OCR, RAG, красивый AIResultCard, similar task.
7. **AI-помощник**: стриминговый чат на странице урока.
8. **Админка**: CRUD для subjects/books/lessons/tasks, загрузка PDF + ingest в embeddings, таблица пользователей, базовая статистика.
9. **Правовые страницы**: privacy / terms / offer с sidebar-навигацией.
10. **Полировка**: анимации, адаптив, SEO-мета на каждом роуте, og:image, проверка всех flow.

---

## Технические детали

- Все Supabase-запросы — через `createServerFn` + `requireSupabaseAuth` (или `supabaseAdmin` для публичных read'ов в loader'ах публичных страниц).
- `attachSupabaseAuth` в `src/start.ts`.
- pgvector для RAG; embeddings через `google/gemini-embedding-001` (1536 dims через `dimensions` param).
- AI calls через AI SDK + `@ai-sdk/openai-compatible` helper, модель по умолчанию `google/gemini-3-flash-preview`, для OCR/multimodal — `google/gemini-2.5-flash`.
- Storage RLS: `homework-uploads` — путь `{user_id}/...`, политика по `auth.uid()`.
- Framer Motion для всех переходов; `prefers-reduced-motion` уважаем.

---

## Что НЕ войдёт в первую итерацию (но архитектура готова)

- Реальная оплата / подписки
- Родительский кабинет
- Реал-тайм соревнования
- Полноценные ачивки с геймификацией (будут базовые)

После аппрува плана начну с шагов 1–2 (фундамент + Cloud-схема), затем последовательно остальное.