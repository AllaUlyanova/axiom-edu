## Что строим

Плавающую кнопку «Чат» в правом нижнем углу на всех страницах сайта. По клику открывается окно: сначала форма (имя + телефон + согласие на политику), затем чат с ИИ-консультантом, который знает наш каталог уроков и помогает выбрать. Внутри чата — кнопка «Позвать оператора» и кнопка «Оформить заявку». Все чаты, заявки и эскалации видны в админке. Админ получает уведомления в Telegram.

## База данных (новые таблицы)

- `chat_visitors` — гость чата: `id`, `name`, `phone`, `consent_at`, `user_id (nullable)`, `created_at`.
- `chat_conversations` — диалог: `id`, `visitor_id`, `status` (`active` / `escalated` / `closed` / `ordered`), `last_message_at`, `created_at`. Эскалация и «оформлена заявка» хранятся флагами/статусом.
- `chat_messages` — сообщения: `id`, `conversation_id`, `role` (`user` / `assistant` / `operator` / `system`), `content`, `created_at`.
- `chat_tickets` — заявки и эскалации: `id`, `conversation_id`, `kind` (`order` / `operator_request`), `subject_id (nullable)`, `lesson_id (nullable)`, `book_id (nullable)`, `note`, `status` (`new` / `in_progress` / `done`), `created_at`.

RLS: чтение/запись только для admin через `has_role`. Гости (anon) с серверной стороны через `supabaseAdmin` — публичных RLS-политик на запись от anon не открываем. Все мутации идут через server functions, которые валидируют визитёра по cookie-токену.

Идентификация гостя: при создании визитёра возвращаем подписанный токен (`visitor_id` + HMAC от `CHAT_VISITOR_SECRET`), кладём в httpOnly cookie. Каждая последующая server fn проверяет токен.

## Серверные функции (`src/lib/chat.functions.ts`)

- `startChatConversation({ name, phone, consent })` — создаёт визитёра + диалог, ставит cookie, шлёт Telegram «🆕 новый чат от …», возвращает `conversationId` и приветствие ассистента.
- `sendChatMessage({ conversationId, content })` — сохраняет сообщение пользователя, тянет историю + сжатый каталог (предметы → книги → уроки c `title`, `summary`, `content_md`), вызывает Lovable AI (`google/gemini-3-flash-preview`) через AI Gateway с system-prompt'ом продавца-консультанта и tool-calls: `create_order({ subject_slug, lesson_slug?, note })`, `request_operator({ reason })`. Сохраняет ответ ассистента, при вызове тулов создаёт `chat_tickets` и шлёт Telegram.
- `requestOperator({ conversationId, note })` — ручная эскалация по кнопке: создаёт ticket `operator_request`, статус диалога `escalated`, Telegram.
- `submitChatOrder({ conversationId, subjectSlug?, lessonSlug?, note })` — оформление заявки по кнопке (как fallback к tool-call), создаёт ticket `order`, статус `ordered`, Telegram.
- `listAdminConversations` / `getAdminConversation` / `sendAdminOperatorMessage` / `updateTicketStatus` — для админки, защищены `requireSupabaseAuth` + проверкой роли `admin`.

Telegram отправка переиспользует существующий паттерн из `src/lib/telegram.functions.ts` (gateway + HTML). Сообщения: новый чат, новая заявка, эскалация оператора. В ссылке — `/admin/chats/:id`.

## Frontend

### Виджет (всегда виден на сайте)

- `src/components/chat/ChatWidget.tsx` — плавающая FAB-кнопка (bottom-right, z-50), при клике открывает панель.
- `src/components/chat/ChatPanel.tsx` — поповер 380×560 (на мобильном — full-screen sheet), три состояния:
  1. **Intro**: форма имя + телефон (ru-маска, zod-валидация) + чекбокс «Согласен с [политикой](/privacy)».
  2. **Chat**: лента сообщений с markdown, индикатор «ассистент печатает», ввод снизу, две вторичные кнопки «Позвать оператора» и «Оформить заявку».
  3. **Submitted**: подтверждение «Заявка отправлена, мы свяжемся с вами».
- Состояние и `conversationId` — в `localStorage`, чтобы чат не сбрасывался при перезагрузке.
- Подключаем в `src/components/site/SiteLayout.tsx` (рендерится на всех страницах кроме `/admin`).

### Админ-раздел

- Новый роут `src/routes/admin.chats.tsx` (внутри существующего админ-layout) — список диалогов с фильтрами (Все / С заявкой / Эскалированы), карточка показывает имя, телефон, последнее сообщение, статус, бейдж тикета.
- `src/routes/admin.chats.$id.tsx` — детальный экран: переписка, панель тикета (если есть), поле «Ответить как оператор» (сообщения с `role=operator` ассистент далее не генерирует автоответы), смена статуса тикета.

## Технические детали

- **AI**: Lovable AI Gateway, модель `google/gemini-3-flash-preview`, system-prompt — «ты консультант школы Умничка.AI, помогаешь подобрать урок из каталога, считаешь и оформляешь заявку, при сложности зови оператора через tool». Каталог подгружается раз в N минут и кешируется в памяти модуля (стандартный паттерн).
- **Секреты**: всё уже есть (`LOVABLE_API_KEY`, `TELEGRAM_API_KEY`, `TELEGRAM_ADMIN_CHAT_ID`). Добавим `CHAT_VISITOR_SECRET` для подписи cookie — попрошу через `add_secret` после твоего «ок».
- **Валидация**: zod на сервере (имя 1–80, телефон — нормализация `+7XXXXXXXXXX`, согласие = true, content ≤ 4000).
- **Rate limit**: простая in-memory защита (10 сообщений/мин на conversation).
- **Realtime для админки**: подписка на `chat_messages` и `chat_tickets` через `supabase.channel`, чтобы админ видел поступающие сообщения live.

## Чего НЕ делаю в этой итерации

- Загрузку файлов/картинок в чат.
- Голосовые сообщения.
- Аналитику диалогов.
- Авторазговор по email (только Telegram уведомление).

После твоего «ок» — начну с миграции, потом сервер, потом виджет, потом админка.