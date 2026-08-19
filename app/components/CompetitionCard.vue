<script setup lang="ts">
import type { Competition } from '#shared/types/api'

const props = defineProps<{ competition: Competition }>()

const { team } = useTeamDirectory()
const winner = computed(() => team(props.competition.winner_team_id))
</script>

<template>
  <NuxtLink
    :to="competitionPath(competition)"
    class="reveal flex gap-3 rounded-xl border border-rule bg-surface p-3 transition-colors hover:border-rule-strong"
  >
    <!-- Логотипа у соревнования почти всегда нет — подставляем марку лиги -->
    <CompetitionLogo
      :src="competition.logo_url"
      :size="48"
    />

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <AppChip variant="outline">
          {{ COMPETITION_TYPE_LABEL[competition.type] }}
        </AppChip>
        <!-- Кубок, а не звезда: звездой на сайте отмечена «моя команда»,
             и звезда с названием команды читалась как она, а не как
             winner_team_id соревнования. -->
        <AppChip
          v-if="winner"
          size="sm"
          variant="accent"
          icon="trophy"
          title="Победитель соревнования"
        >
          {{ winner.name }}
        </AppChip>
      </div>

      <p class="mt-1.5 font-bold">
        {{ competition.name }}
      </p>

      <p class="mt-0.5 text-xs text-muted">
        {{ ruDateRange(competition.start_date, competition.end_date) }}
      </p>
      <p
        v-if="competition.location"
        class="mt-0.5 flex items-center gap-1 text-xs text-muted"
      >
        <AppIcon
          name="mapPin"
          :size="13"
        />
        <span class="truncate">{{ competition.location }}</span>
      </p>
    </div>

    <AppIcon
      name="chevronRight"
      :size="18"
      class="mt-1 shrink-0 self-start text-muted"
    />
  </NuxtLink>
</template>
