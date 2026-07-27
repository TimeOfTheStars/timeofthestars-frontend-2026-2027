<script setup lang="ts">
/**
 * Глобальные canonical и OG. Задаются здесь один раз, а страницы
 * переопределяют только title и description через useSeoMeta.
 */
const route = useRoute()
const { siteUrl } = useRuntimeConfig().public

const canonical = computed(() => `${String(siteUrl).replace(/\/$/, '')}${route.path}`)

useHead({
  link: [{ rel: 'canonical', href: canonical }],
})

useSeoMeta({
  ogType: 'website',
  ogLocale: 'ru_RU',
  ogSiteName: 'Время звёзд',
  ogUrl: canonical,
  ogImage: () => `${String(siteUrl).replace(/\/$/, '')}/brand/logo-vremya-zvezd-512.png`,
  twitterCard: 'summary',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
