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
  // поэтому короткий SWR снимает нагрузку, оставаясь почти свежим.
  //
  // ТОЛЬКО в проде: в dev эти правила кешируют HTML и правки выглядят как
  // «не применились» — проверено на себе.
  $production: {
    routeRules: {
      '/': { swr: 60 },
      '/competitions/**': { swr: 60 },
      '/games/**': { swr: 60 },
      '/teams/**': { swr: 300 },
      '/players/**': { swr: 300 },
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
