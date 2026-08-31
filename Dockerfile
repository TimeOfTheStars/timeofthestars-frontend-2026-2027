# syntax=docker/dockerfile:1

# ---------- зависимости ----------
# Отдельный слой, чтобы npm ci переигрывался только при смене lock-файла.
# --ignore-scripts обязателен: postinstall в package.json — это `nuxt prepare`,
# которому нужны nuxt.config.ts и app/, а их на этом слое ещё нет.
# Ничего не теряем: nuxt build запускает prepare сам.
FROM node:24-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------- сборка ----------
FROM node:24-alpine AS build
WORKDIR /src
COPY --from=deps /src/node_modules ./node_modules
COPY . .
# esbuild — единственная зависимость, которой install-скрипт реально нужен
# (ставит бинарник под платформу). fsevents только под macOS и на Linux не ставится.
RUN npm rebuild esbuild
RUN npm run build

# ---------- runtime ----------
# В образ едет только .output (~4 МБ). node_modules сборки остаются позади.
FROM node:24-alpine AS runtime
WORKDIR /app

# tzdata обязателен. В alpine базы часовых поясов нет вовсе, поэтому
# TZ=Europe/Moscow из compose молча ничего не делал: контейнер оставался в
# UTC, и «сегодня» на сервере с 21:00 до полуночи было вчерашним днём.
# Проверено на проде: TZ выставлена, а date показывал UTC.
RUN apk add --no-cache tzdata

ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000
COPY --from=build --chown=node:node /src/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
