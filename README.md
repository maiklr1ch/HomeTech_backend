# ДомТех — backend

NestJS 11 · PostgreSQL 16 · Prisma 7 · моноліт. Реалізує SRS «ДомТех» v1.2 (UC-01…UC-16). Усі маршрути — під префіксом `/api`, опис API — `openapi.yaml` (Swagger UI: `/api/docs`).

## Архітектура

Шари (DSN-03): маршрути (декоратори контролерів) → контролери → сервіси → репозиторії → Prisma.

```
src/
  auth/           AuthController, ProfileController, AuthService, ProfileService, SessionService, AuthGuard, LoginLimiter
  users/          UserEntity, UsersRepository, PasswordHasher
  catalog/        CatalogController, CartController, CatalogService, CartService, CatalogRepository, ProductVisibility
  products/       ProductsController, ProductsService, ProductsRepository, ProductEntity, ImageStorage
  categories/     CategoriesController, CategoriesService, CategoriesRepository, CategoryAttributeEntity
  manufacturers/  ManufacturersController, ManufacturersService, ManufacturersRepository
  orders/         OrdersController, AdminOrdersController, OrdersService, AdminOrdersService, OrdersRepository, OrderEntity, OrderPresenter
  clients/        ClientsController, ClientsService, AccountMailer
  import/         ImportController, ImportService, KatranParser
  setup/          SetupService (UC-15: стартові категорії, створення адміністратора)
  mail/           MailService (SMTP)
  prisma/         PrismaService, TransactionManager, BaseRepository
  cli/            seed, create-admin, import
  common/         помилки, zod-схеми, утиліти, middleware, фільтр винятків
```

## Змінні середовища (`.env`)

| Змінна | Обов’язкова | Приклад | Призначення |
|---|---|---|---|
| `DATABASE_URL` | так (без Docker) | `postgresql://domtech:pass@localhost:5432/domtech` | Підключення до PostgreSQL. У Docker Compose формується автоматично |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | так (Docker) | `domtech`, `domtech`, `openssl rand -hex 24` | База даних у контейнері. Пароль — лише латиниця й цифри, бо входить в URL |
| `JWT_SECRET` | так | `openssl rand -hex 32` | Підпис сесії, мінімум 32 символи |
| `PORT` | ні (3000) | `3000` | Порт бекенду (у Docker — порт на хості, лише 127.0.0.1) |
| `NODE_ENV` | ні | `production` | У production cookie за замовчуванням `Secure` |
| `CORS_ORIGINS` | ні | `https://domtech.example.com` | Origin(и) фронтенду через кому; вмикає CORS з credentials і перевірку `Origin` для POST/PATCH/DELETE |
| `COOKIE_SECURE` | ні | `true` | `true`, коли сайт працює через HTTPS |
| `COOKIE_SAMESITE` | ні (lax) | `lax` | `none` — лише якщо фронтенд на іншому домені (потрібен HTTPS) |
| `TRUST_PROXY` | ні (false) | `true` | `true` за nginx — реальний IP для обмеження спроб входу |
| `UPLOAD_DIR` | ні (`./uploads`) | `./uploads` | Власні фото товарів (у Docker — том `uploads`) |
| `PUBLIC_URL` | ні | `https://domtech.example.com` | Посилання на сайт у листах клієнтам |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | ні | `smtp.gmail.com`, `587`, `false`, `shop@gmail.com`, `app-password`, `"ДомТех" <shop@gmail.com>` | Лист з тимчасовим паролем клієнту (UC-13). Без SMTP лист не надсилається, пароль показується адміністратору (`emailSent: false`) |

## Розгортання однією командою (Docker Compose, SUP-03)

```bash
cp .env.example .env && nano .env
docker compose up -d --build
```

Compose піднімає `db` (PostgreSQL 16), `backend` (міграції застосовуються під час старту) і `db-backup` — щоденний `pg_dump` у `./backups`, зберігаються 7 останніх копій (REL-05).

Налаштування застосунку (UC-15) і імпорт:

```bash
docker compose exec backend npm run seed
docker compose exec backend npm run create-admin -- admin@domtech.ua "Ламаш Максим"
docker compose cp katran.zip backend:/tmp/katran.zip
docker compose exec backend npm run import -- /tmp/katran.zip
```

`create-admin` двічі запитує пароль (введення приховане).

nginx на хості (фронтенд і API на одному домені):

```nginx
server {
    server_name domtech.example.com;
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
    }

    location / {
        root /var/www/domtech-frontend;
        try_files $uri /index.html;
    }
}
```

Оновлення: `git pull && docker compose up -d --build`.

## Запуск без Docker

Node.js ≥ 20.19, PostgreSQL ≥ 14.

```bash
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run build
npm run seed
npm run create-admin -- admin@domtech.ua "Ламаш Максим"
npm start
```

## CLI

| Команда | Дія |
|---|---|
| `npm run seed` | Стартові категорії з шаблонами характеристик і шаблонами імпорту (повторний запуск пропускає наявні) |
| `npm run create-admin -- <email> "<ПІБ>"` | Створити адміністратора; пароль вводиться двічі |
| `npm run import -- <katran.zip\|katran.csv>` | Імпорт прайсу Katran з консолі |

## API для фронтенду

Повний опис — `openapi.yaml`, інтерактивно — `/api/docs`.

- Сесія — HttpOnly cookie `token` на 7 діб; у fetch завжди `credentials: 'include'`.
- Помилки: `{ "error": { "code", "message", "fields"?, "details"? } }`; `fields` — повідомлення біля полів форми.
- Гроші — рядки `"14899.00"`. Списки — `{ items, page, pageSize: 20, total }`, параметр `page`.
- Номер замовлення — `DT-000123`. `clientOrderId` (uuid) фронтенд генерує один раз на оформлення.
- Заблокований клієнт отримує `403 ACCOUNT_BLOCKED` під час входу і на наступному запиті; видалений — `401`.
- Застарілі замовлення (FUN-12): `GET /api/admin/orders/stale`.
- Власні фото: `/api/uploads/products/…`; поле `imageUrl` у відповідях уже містить правильний шлях.
