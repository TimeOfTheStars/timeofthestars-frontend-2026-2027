<script setup lang="ts">
import type { GameWithProtocol } from '#shared/types/api'

/**
 * Итоги матча: командная статистика двумя колонками, показатель по центру.
 *
 * Полоса под каждой строкой показывает долю — без неё «34 и 17» приходится
 * сравнивать в уме, а весь смысл таблицы в том, чтобы перевес был виден
 * сразу. Доля считается от суммы двух значений, поэтому на нулевой сумме
 * полоса не рисуется вовсе: 50/50 там означало бы равенство, которого нет.
 */
const props = defineProps<{ game: GameWithProtocol }>()

const { team } = useTeamDirectory()

interface Row {
  label: string
  a: number | null
  b: number | null
  suffix?: string
}

/** Сторона матча или null, если по ней ничего не внесли. */
const statOf = (teamId: number) =>
  props.game.team_stats.find(s => s.team_id === teamId) ?? null

const rows = computed<Row[]>(() => {
  const a = statOf(props.game.team_a_id)
  const b = statOf(props.game.team_b_id)
  return [
    { label: 'Броски', a: a?.shots ?? null, b: b?.shots ?? null },
    { label: 'Броски в створ', a: a?.shots_on_goal ?? null, b: b?.shots_on_goal ?? null },
    // Поле называется faceoffs_won: это выигранные вбрасывания, поэтому
    // суммы сторон и не совпадают с общим числом розыгрышей.
    { label: 'Вбрасывания', a: a?.faceoffs_won ?? null, b: b?.faceoffs_won ?? null },
    { label: 'Штрафные минуты', a: a?.penalty_minutes ?? null, b: b?.penalty_minutes ?? null },
    { label: 'Реализация', a: a?.conversion_percent ?? null, b: b?.conversion_percent ?? null, suffix: '%' },
  ]
})

/** Строки, где нет ни одного значения, не показываем — это пустой ряд прочерков. */
const filled = computed(() => rows.value.filter(r => r.a != null || r.b != null))

function share(r: Row): { a: number, b: number } | null {
  if (r.a == null || r.b == null) return null
  const total = r.a + r.b
  if (total <= 0) return null
  return { a: (r.a / total) * 100, b: (r.b / total) * 100 }
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`)
</script>

<template>
  <section class="rounded-2xl border border-rule bg-surface">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-rule px-4 py-3">
      <div class="flex min-w-0 items-center justify-end gap-2">
        <span class="min-w-0 truncate text-sm font-bold">
          {{ team(game.team_a_id)?.name ?? `Команда №${game.team_a_id}` }}
        </span>
        <TeamCrest
          :team="team(game.team_a_id)"
          :team-id="game.team_a_id"
          :size="26"
        />
      </div>
      <span class="text-xl font-extrabold tabular-nums">
        {{ game.score_team_a ?? '—' }}:{{ game.score_team_b ?? '—' }}
      </span>
      <div class="flex min-w-0 items-center gap-2">
        <TeamCrest
          :team="team(game.team_b_id)"
          :team-id="game.team_b_id"
          :size="26"
        />
        <span class="min-w-0 truncate text-sm font-bold">
          {{ team(game.team_b_id)?.name ?? `Команда №${game.team_b_id}` }}
        </span>
      </div>
    </div>

    <ul class="divide-y divide-rule">
      <li
        v-for="row in filled"
        :key="row.label"
        class="reveal px-4 py-3"
      >
        <div class="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
          <span class="text-right text-xl font-extrabold tabular-nums">
            {{ fmt(row.a, row.suffix) }}
          </span>
          <span class="text-center text-[11px] font-bold tracking-wide text-muted uppercase">
            {{ row.label }}
          </span>
          <span class="text-left text-xl font-extrabold tabular-nums">
            {{ fmt(row.b, row.suffix) }}
          </span>
        </div>

        <div
          v-if="share(row)"
          class="mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <span
            class="bg-accent"
            :style="{ width: `${share(row)!.a}%` }"
          />
          <span
            class="flex-1 bg-rule-strong"
          />
        </div>
      </li>
    </ul>
  </section>
</template>
