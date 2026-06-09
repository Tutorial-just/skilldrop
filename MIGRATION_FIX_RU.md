# Исправление Prisma P3006: HelpUrgency already exists

Проблема была в том, что в проекте оказалось две миграции, которые создавали один и тот же enum и таблицу HelpRequest:

- `20260608181526_new_migration`
- `20260608183000_add_help_requests`

Из-за этого shadow database Prisma падала на второй миграции с ошибкой:

```txt
ERROR: type "HelpUrgency" already exists
```

Что исправлено:

- удалена дублирующая миграция `prisma/migrations/20260608183000_add_help_requests`
- оставлена миграция `20260608181526_new_migration`, потому что она уже содержит `HelpUrgency`, `HelpRequestStatus`, `HelpRequest` и `CallOutcome`

Команды после замены проекта:

```bash
npx prisma migrate dev
npx prisma generate
npm run build
```

Если локальная база уже сломалась во время попыток миграции и это dev-база без важных данных, можно сделать:

```bash
npx prisma migrate reset
npx prisma generate
npm run build
```

Для production не используй `migrate reset`. Там только:

```bash
npx prisma migrate deploy
npx prisma generate
```
