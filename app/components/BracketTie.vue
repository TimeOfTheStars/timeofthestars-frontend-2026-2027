<script setup lang="ts">
import type { Tie } from '~/utils/bracket'

const props = defineProps<{ tie: Tie }>()

const { team } = useTeamDirectory()

/** Порядок сторон — как в первом матче пары, не по победителю */
const sides = computed(() => [
  { id: props.tie.teamAId, wins: props.tie.winsA },
  { id: props.tie.teamBId, wins: props.tie.winsB },
])

const isSeries = computed(() => props.tie.games.length > 1)

/**
 * Статус пары, а не отдельного матча.
 *
 * «Завершён» ставится только когда сыграны ВСЕ матчи пары. Раньше здесь
 * стояло `anyPlayed`, и серия, где сыгран 1 матч из 3, объявлялась
 * завершённой — при том что победитель по данным ещё не определён.
 * Промежуточное состояние подписываем счётом матчей, а не словом «идёт»:
 * API не знает, что происходит прямо сейчас.
 */
const statusLabel = computed(() => {
  const t = props.tie
  if (t.allPlayed) return STATUS_LABEL.finished
  if (t.anyPlayed) return `Сыграно ${t.playedCount} из ${t.games.length}`
  return STATUS_LABEL.scheduled
})
/** Единственный матч пары — ссылка ведёт прямо на него */
const single = computed(() => (props.tie.games.length === 1 ? props.tie.games[0]! : null))
const singleOutcome = computed(() => (single.value ? gameOutcome(single.value) : null))
</script>

<template>
  <div class="bk-node rounded-xl border border-rule bg-surface">
    <component
      :is="single ? 'NuxtLink' : 'div'"
      :to="single ? gamePath(single.id) : undefined"
      class="block p-3"
    >
      <ul class="space-y-1.5">
        <li
          v-for="side in sides"
          :key="side.id"
          class="flex items-center gap-2"
        >
          <TeamCrest
            :team="team(side.id)"
            :team-id="side.id"
            :size="26"
          />
          <span
            class="min-w-0 flex-1 truncate text-sm"
            :class="
              tie.winnerId === side.id
                ? 'font-bold'
                : tie.winnerId ? 'font-medium text-muted' : 'font-semibold'
            "
          >{{ team(side.id)?.name ?? `Команда №${side.id}` }}</span>

          <!--
            При равном счёте победителя видно только по этой метке.
            Буква, а не галочка: галочка читается как «отмечено», не «победил».
          -->
          <span
            v-if="singleOutcome?.shootout && tie.winnerId === side.id"
            class="relative inline-flex shrink-0 items-center rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-flag-fg"
          >
            Б
            <span class="sr-only">победа по буллитам</span>
          </span>

          <!-- Серия: показываем счёт по матчам. Один матч: обычный счёт. -->
          <span class="w-7 shrink-0 text-right text-base font-bold tabular-nums">
            <template v-if="isSeries">{{ side.wins }}</template>
            <template v-else-if="single">
              {{ (side.id === single.team_a_id ? single.score_team_a : single.score_team_b) ?? '—' }}
            </template>
          </span>
        </li>
      </ul>

      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <span v-if="isSeries">
          Серия · {{ pluralWith(tie.games.length, ['матч', 'матча', 'матчей']) }}
        </span>
        <span v-else-if="single">{{ ruDateShort(single.date) }}</span>

        <!-- Статус у каждой пары, а не только у несыгранных -->
        <AppChip
          size="sm"
          :variant="tie.allPlayed ? 'accent' : 'neutral'"
        >
          {{ statusLabel }}
        </AppChip>
        <AppChip
          v-if="singleOutcome?.shootout"
          size="sm"
          variant="flag"
        >
          По буллитам
        </AppChip>
        <AppChip
          v-else-if="singleOutcome?.unresolvedTie"
          size="sm"
        >
          Победитель не указан
        </AppChip>
        <AppChip
          v-else-if="singleOutcome?.tied"
          size="sm"
        >
          Ничья
        </AppChip>
      </div>
    </component>

    <!-- Серия: список матчей отдельными ссылками -->
    <ul
      v-if="isSeries"
      class="divide-y divide-rule border-t border-rule"
    >
      <li
        v-for="g in tie.games"
        :key="g.id"
      >
        <NuxtLink
          :to="gamePath(g.id)"
          class="flex min-h-11 items-center gap-2 px-3 text-xs"
        >
          <span class="text-muted">{{ ruDateShort(g.date) }}</span>
          <span class="ml-auto font-bold tabular-nums">
            {{ g.score_team_a ?? '—' }} : {{ g.score_team_b ?? '—' }}
          </span>
          <AppIcon
            name="chevronRight"
            :size="14"
            class="text-muted"
          />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
