<script setup lang="ts">
import type { Game } from '#shared/types/api'

/**
 * Список матчей с группировкой по датам. Порядок серверный
 * (дата → время → id) — своей сортировки не добавляем.
 */
const props = withDefaults(
  defineProps<{
    games: Game[]
    showStage?: boolean
    emptyTitle?: string
    emptyHint?: string
  }>(),
  { showStage: false, emptyTitle: 'Матчей пока нет' },
)

const groups = computed(() => groupGamesByDate(props.games))
</script>

<template>
  <div v-if="games.length">
    <section
      v-for="group in groups"
      :key="group.date"
      class="mb-5 last:mb-0"
    >
      <h3
        class="sticky top-header z-10 -mx-4 mb-2 bg-bg px-4 py-1.5 text-xs font-bold text-muted"
      >
        {{ ruDate(group.date) }}
        <span class="font-normal">· {{ ruWeekday(group.date) }}</span>
      </h3>

      <ul class="space-y-2">
        <li
          v-for="game in group.games"
          :key="game.id"
        >
          <GameCard
            :game="game"
            :show-stage="showStage"
          />
        </li>
      </ul>
    </section>
  </div>

  <EmptyState
    v-else
    icon="calendar"
    :title="emptyTitle"
    :hint="emptyHint"
  />
</template>
