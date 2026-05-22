## Что происходит

Форма (имя + телефон + согласие) валидна, но после клика на «Начать чат» форма не исчезает — то есть `conversationId` не устанавливается. Это значит, что `startChatConversation` либо падает с ошибкой, либо ответ браузером отбрасывается (например, cookie не сохраняется в iframe-превью).

В прошлый раз мы:
1. Поправили `sameSite` на `"none"` для cookie визитёра (cross-site iframe).
2. Добавили валидацию + toast.error в форме.

Сейчас регрессия — нужно поймать настоящую ошибку.

## План

### 1. Подробная диагностика на клиенте
В `src/components/chat/ChatWidget.tsx` в `handleStart`:
- Логировать `console.error("startChatConversation failed", err)` в catch.
- В `toast.error` показывать `err.message` (уже сделано, но проверим, что не перетирается общим текстом).
- Логировать удачный путь: `console.log("chat started", r.conversationId)` — увидим, доходит ли вообще ответ.

### 2. Серверная диагностика
В `src/lib/chat.functions.ts` в `startChatConversation.handler`:
- Обернуть основной код в try/catch и логировать `console.error("startChatConversation handler error", err)` перед re-throw — будет видно в server-function-logs.
- Проверить, что `normalizePhone(data.phone)` для `+7 999 123 45 67` возвращает не пустую строку (если null — это и есть причина «Неверный формат телефона»).

### 3. Проверка third-party cookie
Если запрос отрабатывает успешно, но `fetchMessages` сразу после падает с «Сессия чата истекла» — значит, браузер не сохраняет cookie из iframe-превью даже с `SameSite=None; Secure` (Safari / Brave / Chrome incognito блокируют by default).

Запасной механизм без cookie:
- Возвращать `visitorToken` из `startChatConversation` прямо в ответе.
- Хранить токен в `localStorage` (`umnichka_chat_visitor`) вместе с `conv_id`.
- Принимать токен из header `x-visitor-token` (или из тела) во всех серверных функциях чата (`getChatMessages`, `sendChatMessage`, `requestOperator`, `submitChatOrder`). Cookie оставить как дополнительный fallback.

Это полностью убирает зависимость от cross-site cookie и делает виджет рабочим в любом окружении (включая iframe превью Lovable).

### 4. Проверка после фикса
После сборки протестировать в браузер-агенте: открыть чат, ввести «Тест» / «+79991234567», поставить галочку, нажать «Начать чат» — убедиться, что появляется приветствие ассистента и можно отправить сообщение.

## Технические детали правок

Файлы:
- `src/components/chat/ChatWidget.tsx` — логи + хранение `visitorToken` в `localStorage`, передача его в каждом вызове серверных функций.
- `src/lib/chat.functions.ts` — серверный логинг; возврат `visitorToken` из `startChatConversation`; чтение токена из тела (приоритет) → cookie (fallback) во всех вызовах; cookie остаётся для обратной совместимости.

Без изменений: схема БД, RLS, Telegram, AI-логика, админка.
