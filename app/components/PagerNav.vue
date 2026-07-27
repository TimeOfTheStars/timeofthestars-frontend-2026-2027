<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router'

/** Пагинация ссылками: работает без JS, шарится, индексируется. */
defineProps<{ page: number; pages: number }>()

const route = useRoute()

function pageLink(n: number) {
  const query: LocationQueryRaw = { ...route.query, page: n }
  if (n === 1) delete query.page
  return { path: route.path, query }
}
</script>

<template>
  <nav
    class="mt-6 flex items-center justify-between gap-3"
    aria-label="Страницы"
  >
    <NuxtLink
      v-if="page > 1"
      :to="pageLink(page - 1)"
      rel="prev"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rule px-3 text-sm font-semibold"
    >
      <AppIcon
        name="arrowLeft"
        :size="16"
      />
      Назад
    </NuxtLink>
    <span v-else />

    <span class="text-sm text-muted tabular-nums">{{ page }} из {{ pages }}</span>

    <NuxtLink
      v-if="page < pages"
      :to="pageLink(page + 1)"
      rel="next"
      class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rule px-3 text-sm font-semibold"
    >
      Вперёд
      <AppIcon
        name="chevronRight"
        :size="16"
      />
    </NuxtLink>
    <span v-else />
  </nav>
</template>
