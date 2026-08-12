<script setup lang="ts">
/**
 * Экран-заставка главной: логотип по центру, контент — ниже сгиба.
 *
 * • Высота считается от svh, а не vh. На мобильных Safari/Chrome vh равен
 *   БОЛЬШОМУ вьюпорту (без адресной строки), поэтому заставка на vh всегда
 *   выше экрана на высоту панели браузера, и кнопка «смотреть дальше»
 *   оказывается за нижним краем. svh — это видимый минимум.
 *
 * • Из высоты вычитается шапка (3.5rem) и, до lg, нижняя панель (ещё 3.5rem):
 *   панель фиксированная и накрыла бы низ заставки вместе с кнопкой.
 *
 * • Логотип — широкий локап в WebP: он с альфой (ложится на любой фон
 *   и на обе темы) и весит 26 КБ против 324 КБ у квадратного PNG. Это
 *   LCP-элемент главной, поэтому ему preload и fetchpriority=high.
 *
 * • Текстового дубля вордмарка нет: «ВРЕМЯ ЗВЁЗД» уже нарисовано в самом
 *   логотипе. Имя страницы несёт h1 для скринридера и поиска, а картинка
 *   помечена декоративной — иначе то же самое читалось бы дважды.
 */
useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: '/brand/logo-vremya-zvezd-wide.webp',
      fetchpriority: 'high',
    },
  ],
})
</script>

<template>
  <section class="hero-screen relative flex flex-col items-center justify-center px-4 py-12 text-center">
    <h1 class="sr-only">
      Время звёзд — любительская хоккейная лига
    </h1>

    <img
      src="/brand/logo-vremya-zvezd-wide.webp"
      alt=""
      width="428"
      height="309"
      fetchpriority="high"
      decoding="async"
      class="w-60 max-w-full sm:w-72 lg:w-80"
    >

    <p class="mt-7 max-w-md text-balance text-sm text-muted sm:text-base">
      Таблицы, календарь, составы и статистика — всё считается по протоколам
      матчей и обновляется сразу после их внесения.
    </p>

    <!--
      Настоящая ссылка-якорь, а не кнопка со скриптом: работает без JS,
      открывается в новой вкладке по средней кнопке и остаётся в истории.
    -->
    <a
      href="#content"
      class="mt-9 inline-flex min-h-12 items-center gap-2 rounded-full border border-rule-strong bg-surface px-5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
    >
      Смотреть дальше
      <AppIcon
        name="chevronDown"
        :size="18"
        class="hero-cue"
      />
    </a>
  </section>
</template>
