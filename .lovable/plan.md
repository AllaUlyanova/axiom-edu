## Причина

После последнего изменения форма чата работает только с куки, а FAB вообще не кликабельный, потому что клиентский бандл сломан:

```
[import-protection] Import denied in client environment
Denied by specifier pattern: @tanstack/react-start/server
Importer: src/lib/chat.functions.ts:118
```

В `chat.functions.ts` я вынес `resolveVisitorId()` на верхний уровень модуля, и она использует `getCookie` из `@tanstack/react-start/server`. Server-fn Vite-плагин вырезает из клиентского бандла только тело `.handler()`. Любая ссылка на server-only API вне `.handler()` (в утилитах, top-level, других экспортах) остаётся в клиенте → import-protection валит всю сборку, страница не гидратируется, никакие onClick не работают.

## Фикс

### 1. Убрать `resolveVisitorId` из top-level
Файл `src/lib/chat.functions.ts`:
- Удалить функцию `resolveVisitorId`.
- В каждом из четырёх хендлеров (`getChatMessages`, `sendChatMessage`, `requestOperator`, `submitChatOrder`) заменить вызов `resolveVisitorId(data.visitorToken)` на инлайновый:

```ts
const token = data.visitorToken || getCookie(VISITOR_COOKIE);
const visitorId = verifyVisitorToken(token);
```

Так все обращения к `getCookie` остаются строго внутри `.handler()` и удаляются из клиента трансформером.

### 2. Проверка
- Открыть превью, убедиться, что круглая кнопка чата снова реагирует на клик.
- Заполнить форму (имя, телефон, согласие), нажать «Начать чат» — должен открыться чат с приветствием.

Других правок не нужно — серверная логика, БД, RLS, Telegram, админка остаются как есть.
