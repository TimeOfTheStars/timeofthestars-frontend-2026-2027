# Время звёзд — фронтенд

Nuxt 4 (SSR, Nitro `node-server`) для сайта [timeofthestars.ru](https://timeofthestars.ru).
Данные берутся из отдельного бэкенда на `api.timeofthestars.ru` — в этом репозитории
только фронтенд.

## Разработка

```bash
npm install
cp .env.example .env      # и прописать адрес API
npm run dev
```

Без доступа к боевому API есть встроенный мок:

```bash
npm run mock              # поднимает фейковый API на :8099
npm run dev:mock          # dev-сервер, смотрящий в мок
```

Прочие команды: `npm run build`, `npm run preview`, `npm run typecheck`.

## Переменные окружения

| Переменная | Назначение |
|---|---|
| `NUXT_PUBLIC_API_BASE` | Базовый адрес API, без слэша на конце. Пути идут под `/api/v1`, файлы — под `/media` |
| `NUXT_PUBLIC_SITE_URL` | Публичный адрес сайта — для canonical, OG и sitemap |

Обе переменные читаются **при старте сервера**, а не на сборке: Nuxt отдаёт
`runtimeConfig.public` в SSR-payload. Поэтому один и тот же образ годится и для
прода, и для стенда — достаточно поменять окружение.

## Прод

`timeofthestars.ru` → VPS 5.129.241.16 (Timeweb, Москва, 2 vCPU / 2 ГБ, Ubuntu 26.04).
Внутри — два контейнера: Caddy (TLS, реверс-прокси) и Nuxt.

Конфигурация прода лежит на сервере в `/srv/timeofthestars/`
(`docker-compose.yml` и `Caddyfile` — копии одноимённых файлов из этого репозитория).

### Деплой

Автоматический: **push в `main`** запускает `.github/workflows/deploy.yml`, который
собирает образ, пушит в `ghcr.io` и выкатывает его на сервер. Ручной запуск —
через «Run workflow» во вкладке Actions.

Образ **собирается в CI, а не на сервере**, и это не вкусовщина: `nuxt build`
на пике берёт около 2 ГБ, столько же, сколько всего есть на машине. Node и npm
на прод-сервер не ставятся вовсе — он только делает `docker compose pull`.

### Откат

У каждого образа есть тег `sha-<коммит>`:

```bash
ssh root@5.129.241.16
cd /srv/timeofthestars
docker compose pull web                      # или укажите нужный тег в docker-compose.yml
docker compose up -d --no-deps --wait web
```

### Диагностика

```bash
docker compose ps                 # состояние и healthcheck
docker compose logs -f web        # логи приложения
docker compose logs -f caddy      # логи прокси и выпуска сертификатов
docker stats --no-stream          # потребление памяти
free -m                           # не ушла ли машина в swap
```

## Кеширование

В проде включён SWR (`nuxt.config.ts`, блок `$production.routeRules`): главная,
соревнования и игры кешируются на 60 с, команды и игроки — на 300 с, карта сайта
— на час. Бэкенд считает таблицы SQL-агрегацией на каждый запрос, и SWR снимает
с него основную нагрузку.

Кеш хранится **в памяти процесса**: рестарт контейнера его обнуляет, и при
нескольких репликах он не общий.
