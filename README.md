# Animal Shelter Platform

Уеб-базирана модулна система за управление на приюти за животни с REST архитектура.

## Пълна документация

Подробната документация за архитектура, роли, модули, база данни, REST endpoint-и, use case-и и диаграми е в [docs/SYSTEM_DOCUMENTATION.md](docs/SYSTEM_DOCUMENTATION.md).

Краткият guide за защита, demo профили, примерни данни и checklist е в [docs/DEMO_READINESS.md](docs/DEMO_READINESS.md).

## Технологии

- Node.js + Express.js
- React + Vite
- MongoDB + Mongoose
- JWT + bcrypt
- JSON fallback за локална разработка и smoke/regression проверки

## Роли

- `guest`: вижда началната страница, животните, детайлите, търсене и филтриране, както и страниците за вход и регистрация.
- `client`: всичко от `guest`, плюс подаване на заявки за осиновяване, преглед на собствените заявки и отмяна на `pending` заявка.
- `employee`: всичко нужно за оперативна работа с животни и заявки; може да създава и редактира животни, да сменя статуси и да обработва заявки.
- `admin`: всичко от `employee`, плюс административен достъп до потребителския списък, отчети и деактивиране/архивиране на животни.

## Auth flow

Готовият auth модул покрива:

- регистрация на публичен `client`
- вход
- изход
- хеширане на пароли с `bcrypt`
- JWT token в API отговора
- cookie + bearer token поддръжка
- backend middleware за `requireAuth`, роли и permissions
- frontend route guards за `guest`, `client`, `employee` и `admin`

## Animals flow

Готовият Animals модул покрива:

- публичен list view
- details view
- филтриране, търсене, сортиране и pagination през query параметри
- create/edit/status change за `employee` и `admin`
- deactivate/archive за `admin`
- role-based UI и backend защита
- връзка към база данни или JSON fallback при локален режим

Основни API маршрути:

- `GET /api/animals`
- `GET /api/animals/:animalId`
- `POST /api/animals`
- `PATCH /api/animals/:animalId`
- `PATCH /api/animals/:animalId/status`
- `PATCH /api/animals/:animalId/deactivate`

## Adoption flow

Готовият Adoption модул покрива:

- подаване на заявка от `client`
- страница „Моите заявки“
- списък на всички заявки за `employee`/`admin`
- филтриране по статус
- промяна на статус от служебната част
- отмяна на `pending` заявка от клиента
- синхронизация със статуса на животното

Домейн логика:

- заявка се подава само за животно със статус `available`
- `under-review`/`approved` резервира животното като `reserved`
- `completed` прави животното `adopted`
- `cancelled`/`rejected` връща животното към `available`, ако няма друга активна служебна заявка за него

Основни API маршрути:

- `POST /api/adoptions`
- `GET /api/adoptions/my`
- `GET /api/adoptions/:id`
- `GET /api/adoptions`
- `PATCH /api/adoptions/:id/status`
- `PATCH /api/adoptions/:id/cancel`

## .env и локална конфигурация

1. Копирай `.env.example` като `.env`.
2. Попълни нужните стойности.
3. Инсталирай зависимостите локално за текущата машина.

Примерен `.env.example`:

```env
PORT=5000
DB_URL=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_here
ANIMALS_ALLOW_MOCK_FALLBACK=false
VITE_DEV_SERVER_PORT=5173
VITE_DEV_API_TARGET=your_local_backend_origin_here
```

Бележки:

- `DB_URL` е нужен за реален MongoDB режим.
- `JWT_SECRET` е задължителен за предвидим локален auth.
- `ANIMALS_ALLOW_MOCK_FALLBACK=true` позволява локален fallback режим, когато MongoDB не е налична.
- `VITE_DEV_API_TARGET` се попълва локално в `.env`, за да проксира `/api` заявките от Vite към backend-а.

## Стартиране на проекта

Инсталиране на зависимости:

```bash
npm ci
```

Ако `npm ci` не мине заради lock файла:

```bash
npm install
```

Разработка:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Regression check

Наличен е минимален локален smoke/regression script за вече готовите сценарии:

```bash
npm run check:regression
```

Скриптът прави временен backup на JSON данните, изпълнява основните auth/animals/adoptions сценарии и накрая възстановява оригиналните файлове.

## Demo seed

За подготовка на примерни профили, животни и заявки за защита:

```bash
npm run seed:demo
```

Скриптът подготвя JSON fallback данните и, ако има активна MongoDB връзка, upsert-ва същите demo записи и в базата. Ако demo-то е без MongoDB, включи `ANIMALS_ALLOW_MOCK_FALLBACK=true` в `.env`.

## Полезни файлове

- [server/app.js](server/app.js)
- [server/modules/auth](server/modules/auth)
- [server/modules/animals](server/modules/animals)
- [server/modules/adoptions](server/modules/adoptions)
- [client/src/routes/AppRoutes.jsx](client/src/routes/AppRoutes.jsx)
- [client/src/auth/AuthProvider.jsx](client/src/auth/AuthProvider.jsx)

## Важно при архивиране

Не включвай в `.zip` или Git:

- `node_modules/`
- `client/node_modules/`
- `dist/`
- `client/dist/`
- `.env`
- `.codex-*.log`

`package-lock.json` трябва да остане в проекта. `node_modules` не трябва да се пренася между различни операционни системи.



