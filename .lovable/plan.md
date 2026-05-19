# Исправление двух блокирующих багов

## Что нашёл при диагностике

Открыл `/subjects/math`, кликнул по уроку — URL **меняется** на `/subjects/math/lessons/1`, но визуально остаётся страница предмета. Регистрация в `signup.tsx` тоже технически вызывает `supabase.auth.signUp`, но пользователь не видит результата.

### Баг #1 — уроки «не кликабельны» (на самом деле — не рендерятся)

В TanStack Router плоское именование `subjects/$slug.tsx` + `subjects/$slug.lessons.$lessonId.tsx` автоматически делает `$slug` **layout-родителем** для урока. Файл `src/routes/subjects/$slug.tsx` рендерит контент предмета, но **не содержит `<Outlet />`** → дочерний роут урока матчится, но ему негде отрисоваться. Пользователь видит ту же страницу предмета и думает, что клик «не работает».

### Баг #2 — «Создать аккаунт» ничего не делает

`supabase.auth.signUp` отрабатывает, но по умолчанию требуется подтверждение email → сессия не создаётся. Код в `signup.tsx` всё равно вызывает `navigate({to:"/dashboard"})`, а guard в `dashboard.tsx` редиректит обратно на `/login`. Пользователь видит — «ничего не произошло».

## Что сделаю

### 1. Починить роутинг уроков

Разделить `subjects/$slug.tsx` на layout + index:
- `src/routes/subjects/$slug.tsx` — превратить в pathless layout: только `<Outlet />` (без UI).
- `src/routes/subjects/$slug.index.tsx` — перенести сюда текущий UI `SubjectPage` (учебники + список уроков). Загрузка через тот же `getSubjectWithContent`.
- `subjects/$slug.lessons.$lessonId.tsx` остаётся как есть — теперь корректно рендерится внутри layout.

После этого клик по уроку откроет полноценную lesson page (она уже реализована: страницы учебника, задания, кнопка «Проверить ДЗ» → `/check`).

### 2. Починить регистрацию

В `src/routes/signup.tsx`:
- После `signUp` проверять `data.session`.
  - Если **сессия есть** (auto-confirm включён) → `toast.success` + `navigate("/dashboard")`.
  - Если **сессии нет** (нужен email-confirm) → показать toast «Проверь почту и подтверди email, потом войди» и `navigate("/login")`.
- Показывать `error.message` через `toast.error` (уже есть, оставить).
- Кнопка уже имеет `disabled={loading}` и текст «Создаём...» — оставить.

Чтобы UX был «зарегистрировался → сразу в кабинет», параллельно вызову `supabase--configure_auth` с `auto_confirm_email: true` (по умолчанию выключено по политике, но для учебной платформы для детей это оправдано — спрошу подтверждение у тебя в реализации).

### 3. Smoke-проверка

- `/subjects/math` → клик по уроку → открывается `/subjects/math/lessons/1` с заданиями и страницами учебника.
- `/signup` → создание → редирект в `/dashboard` (auto-confirm) или `/login` с toast (без auto-confirm).
- `/login` → вход → `/dashboard`.

## Файлы

- `src/routes/subjects/$slug.tsx` — заменить на layout c `<Outlet />`.
- `src/routes/subjects/$slug.index.tsx` — создать, перенести текущий `SubjectPage`.
- `src/routes/signup.tsx` — корректная обработка отсутствующей сессии.
- (опц.) `supabase--configure_auth` — включить auto-confirm для гладкого онбординга.

## Что НЕ трогаю

- Lesson page, AI-проверка, каталог, БД, дизайн — работают и не входят в скоуп этих двух багов.
