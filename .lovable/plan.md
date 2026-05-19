# План: Английский язык — учебник Spotlight 3 + динамическая система

Загруженные файлы: `Spotlight-3-Workbook.pdf` и `Spotlight-3-Workbook-2.pdf` — это рабочая тетрадь Spotlight 3 класс (Быкова/Дули, «Английский в фокусе»).

Задача — повторить готовый pipeline, который уже работает на математике Моро, но для английского, и добить динамику так, чтобы новые учебники подключались без правки кода.

---

## 1. Состояние as-is (что уже есть)

- БД: `subjects / books / lessons / tasks / book_pages / submissions / progress / profiles / user_roles`. RLS настроены, роль admin есть.
- Storage: bucket `textbooks` (приватный, PDF), `textbook-pages` (публичный, JPG страниц).
- Математика Моро уже залита: 226 страниц, 110 уроков с `page_from/page_to`, OCR в `book_pages.ocr_text`.
- Динамика уроков **уже работает** через `subjects/$slug.lessons.$lessonId.tsx` + `getLesson()` — никаких hardcoded id 5/12/20/35 в коде нет (это было в старой версии до текущей итерации, проблема решена).
- `checkHomework` уже умеет vision: тянет картинки страниц + OCR, отправляет в Gemini 2.5 Flash вместе с фото тетради ученика.
- `/admin` показывает статистику и список уроков, но без CRUD учебников и без загрузки PDF.

Чего не хватает для английского:
- предмета `english` нет;
- нет загрузки/обработки нового PDF из UI;
- нет понятий **Unit / Exercise / Vocabulary / Grammar** (для математики хватало lesson+task);
- нет RAG-поиска (для математики работает «вся страница в контекст», для языка нужен semantic search по vocabulary/grammar);
- нет английских промптов и kid-friendly режима для языка.

---

## 2. Архитектура (что добавляем)

```text
PDF upload (admin)
    │
    ▼
Storage: textbooks/english/spotlight-3/part-{1,2}.pdf
    │
    ▼
ingest job  (server fn, фоновая)
    │   ├─ pdftoppm  → JPG страниц → textbook-pages/{book_id}/p-XXX.jpg
    │   ├─ tesseract -l eng → ocr_text на страницу
    │   ├─ AI structure extractor (Gemini 2.5 Pro):
    │   │     OCR + картинки → JSON { units[], lessons[], exercises[], vocabulary[], grammar[] }
    │   ├─ INSERT в units / lessons / exercises / tasks / vocabulary / grammar_topics
    │   └─ embeddings (gemini-embedding-001) на каждый chunk → pgvector
    │
    ▼
Студент: /subjects/english → unit → lesson → exercise
Студент: /check?subject=english&lesson=…&task=… → checkHomework (vision + RAG)
Админ:  /admin/books → upload / status / re-index / edit lessons & tasks
```

### Схема БД (миграция)

Расширяем существующую, не ломая математику:

```sql
-- предмет «английский»
INSERT INTO subjects (slug, name, icon, color, sort_order) VALUES ('english', ...);

-- units (новый уровень над lessons)
CREATE TABLE units (
  id uuid PK, book_id uuid, number int, title text, summary text,
  page_from int, page_to int, sort_order int, created_at timestamptz
);
ALTER TABLE lessons ADD COLUMN unit_id uuid REFERENCES units(id);

-- exercises (упражнения внутри урока, для языков)
CREATE TABLE exercises (
  id uuid PK, lesson_id uuid, number text, -- "Ex. 2a"
  prompt text, instruction text, page_number int,
  source_image_url text, type text -- 'reading' | 'writing' | 'listening' | 'grammar' | 'vocab'
);
ALTER TABLE tasks ADD COLUMN exercise_id uuid REFERENCES exercises(id);

-- vocabulary
CREATE TABLE vocabulary (
  id uuid PK, book_id uuid, unit_id uuid, lesson_id uuid,
  word text, translation text, transcription text, example text,
  page_number int
);

-- grammar topics
CREATE TABLE grammar_topics (
  id uuid PK, book_id uuid, unit_id uuid, lesson_id uuid,
  title text, rule_md text, examples jsonb, page_number int
);

-- ingest jobs
CREATE TABLE ingest_jobs (
  id uuid PK, book_id uuid, status text, -- queued|parsing|ocr|structuring|embedding|done|error
  progress int, total int, log text, error text,
  started_at timestamptz, finished_at timestamptz
);

-- RAG: chunks + embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE book_chunks (
  id uuid PK, book_id uuid, unit_id uuid, lesson_id uuid,
  page_number int, kind text, -- 'page' | 'vocabulary' | 'grammar' | 'exercise'
  content text, embedding vector(1536)
);
CREATE INDEX book_chunks_embedding_idx ON book_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE FUNCTION match_book_chunks(book_ids uuid[], query vector(1536), k int)
  RETURNS TABLE (...);
```

RLS: для всех новых таблиц — public SELECT, admin ALL (как у `lessons/tasks`). `ingest_jobs` — только admin.

---

## 3. Pipeline ingestа (server-side)

Реализуем в `src/lib/ingest.functions.ts` (server fn, admin only). Поскольку Worker-runtime не умеет `pdftoppm`/`tesseract`, обработка идёт **в sandbox dev-server** при разработке + при проде — через серверную задачу, которая делает то же самое через **облачный AI vision** (Gemini Pro принимает PDF/изображения напрямую).

Шаги:

1. **Upload** → `POST /api/public/ingest-pdf` (или server fn `uploadTextbook`): кладём PDF в `textbooks/`, создаём запись в `books` и `ingest_jobs(status='queued')`.
2. **Render pages**: для каждой страницы — JPG в `textbook-pages/{book_id}/p-XXX.jpg`. На dev — pdftoppm локально (как делали с Моро). В UI прогресс пишется в `ingest_jobs.progress`.
3. **OCR**: tesseract `-l eng+rus` (в учебнике есть переводы и инструкции на русском) → `book_pages.ocr_text`.
4. **Structure extraction (AI)**: Gemini 2.5 Pro vision получает батч страниц (≤ 8 на запрос) + промпт «верни JSON с unit/lesson/exercise/vocab/grammar». Сохраняем в соответствующие таблицы. Это даёт реальные границы Units 1–10 в Spotlight, а не «1 разворот = 1 урок».
5. **Embeddings**: для каждой страницы, vocab-записи, grammar-блока — `google/gemini-embedding-001` (dim=1536 через `dimensions`), INSERT в `book_chunks`.
6. **Done**: `ingest_jobs.status='done'`, книга появляется в каталоге.

Повторная индексация — кнопка «Re-index» в админке: чистит `book_chunks/units/lessons/exercises/vocabulary/grammar_topics` по `book_id` и запускает шаги 4–5 заново (PDF и страницы переиспользуем).

---

## 4. AI-проверка английского + RAG

`checkHomework` расширяем (новый режим `subject=english`):

1. По `subject/lesson/exercise/task` берём задание + страницу + картинку.
2. Берём embedding ответа ученика → `match_book_chunks(book_ids=[english_books], k=8)` → подмешиваем top-k чанков (vocab/grammar/page) в системный промпт.
3. Gemini 2.5 Flash (vision + текст), английский kid-friendly промпт:
   - проверка spelling, grammar, перевода;
   - объяснение по-русски, простыми словами;
   - не ругать, мотивировать, давать «попробуй ещё раз» + похожее задание.
4. Возврат той же структуры (`isCorrect/verdict/explanation/steps/hint/similar/motivation`) + новые поля `mistakes[] {span, type, suggestion}` для подсветки слов.

Если top-k чанков ниже порога similarity → ответ «Я не нашёл это задание в учебнике».

---

## 5. UI

Маршруты (file-based, всё динамическое):

```text
/subjects/english                              — каталог: units → lessons
/subjects/english/units/$unitId                — unit с list уроков + vocab/grammar секциями
/subjects/$slug/lessons/$lessonId              — (уже есть) — расширяем: показывает exercises, vocab, grammar, страницы
/subjects/$slug/lessons/$lessonId/exercises/$exId  — отдельная страница упражнения с кнопкой «Проверить»
/check?subject=english&lesson=…&exercise=…&task=… — форма ответа (текст + фото)

/admin/books                                   — список книг + статус ingest
/admin/books/upload                            — drag&drop, валидация, прогресс
/admin/books/$id                               — редактор units/lessons/exercises, кнопка re-index, удалить
```

Никакого hardcode: все списки рендерятся через `.map()` из `getSubjectWithContent` / `getUnitWithLessons` / `getLesson`. Маршруты `$slug` / `$lessonId` / `$unitId` / `$exId` — динамические.

Стиль — текущий glassmorphism + светлая тема, добавляем dropzone, progress bar, badge статусов ingest.

---

## 6. Что делаем в этой итерации

Скоуп одной реализации (один approve):

1. **Миграция**: units, exercises, vocabulary, grammar_topics, ingest_jobs, book_chunks + pgvector + RLS + RPC `match_book_chunks`. Subject `english`.
2. **Ingest pipeline** (sandbox-friendly): загрузка PDF в storage, рендер + OCR (eng+rus) обоих файлов Spotlight 3, AI-structure extraction (Gemini 2.5 Pro), запись units/lessons/exercises/vocabulary/grammar, embeddings.
3. **UI каталога английского**: `/subjects/english` с units → lessons (полностью динамика).
4. **Страница урока** расширяется секциями exercises / vocabulary / grammar.
5. **`/admin/books`**: список книг + статус ingest + upload-форма + re-index + удаление.
6. **`checkHomework` для английского**: RAG (vector search) + новый промпт + поддержка `exercise_id`.
7. **Smoke-проверка**: открыть 5 случайных уроков Spotlight 3 — все рендерятся; отправить тестовый ответ на упражнение — приходит AI-разбор.

---

## 7. Технические детали (для тех, кто читает код)

- Стек проекта: **TanStack Start + Vite + Supabase (Lovable Cloud)**, а не Next.js/Prisma. Все «backend-функции» — это `createServerFn` (см. `src/lib/*.functions.ts`), не Edge Functions.
- AI: Lovable AI Gateway, модели `google/gemini-2.5-flash` (проверка), `google/gemini-2.5-pro` (structure extraction), `google/gemini-embedding-001` (embeddings, 1536 dims через Matryoshka).
- OCR / render: `pdftoppm` + `tesseract -l eng+rus` в dev-sandbox (как уже делали для Моро). Для прод-загрузки нового учебника через UI — fallback на «Gemini Pro принимает страницы как изображения и сам делает OCR + structure» в одном проходе, чтобы не зависеть от системных бинарей в Worker.
- pgvector: `vector(1536)`, HNSW индекс, cosine distance.
- Хранилища: `textbooks` (приватный, PDF), `textbook-pages` (публичный, JPG). Buckets уже есть.
- Все новые таблицы — public SELECT (контент открыт), admin ALL (через `has_role`).

---

## 8. Что НЕ делаем сейчас (явно)

- Аудио для listening-упражнений (нет в загруженных PDF).
- Speech-to-text для устной речи ученика.
- Платная подписка / лимиты.
- Прод-ingest без sandbox-бинарей (если понадобится — отдельная итерация с Gemini-only pipeline).

После approve — выполняю миграцию, заливаю Spotlight 3 (обе части), строю UI и AI-проверку, и в конце прохожу smoke-чек на 5 случайных уроках.
