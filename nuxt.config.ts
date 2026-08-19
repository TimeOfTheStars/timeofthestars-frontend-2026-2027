import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-27',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  runtimeConfig: {
    public: {
      // Переопределяется переменной NUXT_PUBLIC_API_BASE
      apiBase: 'http://localhost:8002',
      siteUrl: 'https://timeofthestars.ru',
    },
  },

  // Бэкенд считает таблицу и статистику SQL-агрегацией на каждый запрос,
  // поэтому короткий кеш снимает нагрузку, оставаясь почти свежим.
  // Замер на проде: standings и best-players отвечают за 20–24 мс, так что
  // 15 секунд — уже достаточная защита, дальше держать смысла нет.
  //
  // swr: false принципиален. При swr: true Nitro после истечения срока
  // отдаёт УСТАРЕВШЕЕ значение и обновляет кеш в фоне — свежее видно только
  // со следующего запроса. Из-за этого правка в админке появлялась лишь
  // после второго обновления страницы.
  //
  // Пути перечислены парами: шаблон /teams/** покрывает только вложенные
  // адреса, сам раздел /teams под него не подпадает и раньше не кешировался
  // вовсе.
  //
  // ТОЛЬКО в проде: в dev эти правила кешируют HTML и правки выглядят как
  // «не применились» — проверено на себе.
  $production: {
    routeRules: {
      '/': { cache: { maxAge: 15, swr: false } },
      '/competitions': { cache: { maxAge: 15, swr: false } },
      '/competitions/**': { cache: { maxAge: 15, swr: false } },
      '/games': { cache: { maxAge: 15, swr: false } },
      '/games/**': { cache: { maxAge: 15, swr: false } },
      '/teams': { cache: { maxAge: 15, swr: false } },
      '/teams/**': { cache: { maxAge: 15, swr: false } },
      '/players': { cache: { maxAge: 15, swr: false } },
      '/players/**': { cache: { maxAge: 15, swr: false } },
      // Карта сайта собирается из API до семи запросами на каждый хит,
      // а её собственный max-age — кеш браузера, который краулер игнорирует.
      '/sitemap.xml': { cache: { maxAge: 3600, swr: false } },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      titleTemplate: '%s · Время звёзд',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#274B97', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#171924', media: '(prefers-color-scheme: dark)' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // Кириллический сабсет — единственный шрифт на первом экране, грузим сразу.
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/golos-text-cyrillic.woff2',
          crossorigin: 'anonymous',
        },
      ],
      script: [
        {
          // Ставит класс темы ДО первой отрисовки. Обязателен: HTML отдаётся
          // из SWR-кеша без класса, и без этого был бы белый мигающий кадр
          // у пользователя с тёмной темой.
          tagPosition: 'head',
          innerHTML:
            '(function(){try{var s=localStorage.getItem("vz-theme");'
            + 'var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;'
            + 'document.documentElement.classList.toggle("dark",d)}catch(e){}})()',
        },
      ],
    },
  },
})
