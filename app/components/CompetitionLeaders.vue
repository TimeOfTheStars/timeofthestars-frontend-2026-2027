<script setup lang="ts">
import type { CompetitionPlayerWithStats } from '#shared/types/api'

/**
 * Статистика игроков соревнования: снайперы, бомбардиры, ассистенты — по
 * топ-10 в каждой колонке. На телефоне колонки идут друг под другом.
 */
const props = defineProps<{
  /** состав соревнования со статистикой — единственный источник цифр */
  roster: CompetitionPlayerWithStats[]
}>()

const snipers = computed(() => buildLeaders(props.roster, 'goals'))
const scorers = computed(() => buildLeaders(props.roster, 'points'))
const assistants = computed(() => buildLeaders(props.roster, 'assists'))
</script>

<template>
  <div v-if="hasLeaders(roster)">
    <div class="grid gap-3 lg:grid-cols-3">
      <LeadersColumn
        title="Снайперы"
        unit="Г"
        unit-title="Голы"
        :rows="snipers"
      />
      <LeadersColumn
        title="Бомбардиры"
        unit="О"
        unit-title="Очки (голы + передачи)"
        :rows="scorers"
        show-breakdown
      />
      <LeadersColumn
        title="Ассистенты"
        unit="П"
        unit-title="Передачи"
        :rows="assistants"
      />
    </div>

    <p class="mt-3 px-1 text-xs text-muted">
      Очки = голы + передачи. При равенстве выше тот, кто сыграл меньше матчей.
    </p>
  </div>

  <EmptyState
    v-else
    icon="star"
    title="Пока некого показать"
    hint="Статистика появится, когда в протоколах матчей появятся голы и передачи."
  />
</template>
