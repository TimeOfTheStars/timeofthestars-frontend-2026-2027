<script setup lang="ts">
/** Кнопка «Лучшие игроки»: сразу на вкладку статистики соревнования. */
defineProps<{ competitionId: number }>()
</script>

<template>
  <NuxtLink
    :to="{ path: competitionPath({ id: competitionId }), query: { tab: 'stats' } }"
    class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-rule bg-surface px-3.5 text-sm font-semibold whitespace-nowrap transition-colors hover:border-accent hover:text-accent"
  >
    <AppIcon
      name="star"
      :size="16"
    />
    Лучшие игроки
  </NuxtLink>
</template>
