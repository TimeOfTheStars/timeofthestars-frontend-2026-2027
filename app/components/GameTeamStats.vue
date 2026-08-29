<script setup lang="ts">
import type { GameWithProtocol } from '#shared/types/api'

/**
 * Итоги матча: командная статистика двумя колонками, показатель по центру.
 *
 * Полоса под строкой красится цветами команд (crestColor), а не «акцент
 * против серого»: серая половина читалась как «данных нет», хотя это
 * полноценное значение соперника.
 *
 * Ведущая сторона выделена начертанием, отстающая приглушена — так перевес
 * виден без сравнения цифр в уме. Направление у показателей РАЗНОЕ: по
 * броскам лучше больше, по штрафным минутам — меньше, поэтому у строки есть
 * свой признак, а не общее правило «больше значит лучше».
 *
 * Счёт здесь не дублируется: он крупно стоит в шапке матча выше.
 */
const props = defineProps<{ game: GameWithProtocol }>()

const { team } = useTeamDirectory()

interface Row {
  label: string
  a: number | null
  b: number | null
  suffix?: string
  /** у штрафных минут выигрывает меньшее значение */
  lowerWins?: boolean
}

const statOf = (teamId: number) =>
  props.game.team_stats.find(s => s.team_id === teamId) ?? null

const rows = computed<Row[]>(() => {
  const a = statOf(props.game.team_a_id)
  const b = statOf(props.game.team_b_id)
  return [
    { label: 'Броски', a: a?.shots ?? null, b: b?.shots ?? null },
    { label: 'Броски в створ', a: a?.shots_on_goal ?? null, b: b?.shots_on_goal ?? null },
    // faceoffs_won — выигранные вбрасывания, поэтому суммы сторон не равны
    // общему числу розыгрышей.
    { label: 'Вбрасывания', a: a?.faceoffs_won ?? null, b: b?.faceoffs_won ?? null },
    {
      label: 'Штрафные минуты',
      a: a?.penalty_minutes ?? null,
      b: b?.penalty_minutes ?? null,
      lowerWins: true,
    },
    { label: 'Реализация', a: a?.conversion_percent ?? null, b: b?.conversion_percent ?? null, suffix: '%' },
  ]
})

/** Строка без обоих значений — это ряд прочерков, показывать нечего. */
const filled = computed(() => rows.value.filter(r => r.a != null || r.b != null))

/** 'a' | 'b' | null — null при равенстве или когда сравнивать не с чем. */
function leader(r: Row): 'a' | 'b' | null {
  if (r.a == null || r.b == null || r.a === r.b) return null
  const aWins = r.lowerWins ? r.a < r.b : r.a > r.b
  return aWins ? 'a' : 'b'
}

/**
 * Доля стороны в полосе. Считается от суммы, поэтому при нулевой сумме
 * полосы нет вовсе: 50/50 там означало бы равенство, которого нет.
 */
function share(r: Row): { a: number, b: number } | null {
  if (r.a == null || r.b == null) return null
  const total = r.a + r.b
  if (total <= 0) return null
  return { a: (r.a / total) * 100, b: (r.b / total) * 100 }
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

const colorA = computed(() => crestColor(props.game.team_a_id))
const colorB = computed(() => crestColor(props.game.team_b_id))
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-rule bg-surface">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-surface-2 px-4 py-3">
      <div class="flex min-w-0 items-center justify-end gap-2">
        <span class="min-w-0 truncate text-sm font-bold">
          {{ team(game.team_a_id)?.name ?? `Команда №${game.team_a_id}` }}
        </span>
        <TeamCrest
          :team-id="game.team_a_id"
          :size="28"
        />
      </div>
      <span class="text-[10px] font-bold tracking-wider text-muted uppercase">
        итоги
      </span>
      <div class="flex min-w-0 items-center gap-2">
        <TeamCrest
          :team-id="game.team_b_id"
          :size="28"
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
        class="reveal px-4 py-3.5"
      >
        <div class="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span
            class="text-right text-2xl leading-none tabular-nums"
            :class="leader(row) === 'a' ? 'font-extrabold text-fg' : 'font-bold text-muted'"
          >{{ fmt(row.a, row.suffix) }}</span>

          <span class="text-center text-[11px] font-bold tracking-wide text-muted uppercase">
            {{ row.label }}
          </span>

          <span
            class="text-left text-2xl leading-none tabular-nums"
            :class="leader(row) === 'b' ? 'font-extrabold text-fg' : 'font-bold text-muted'"
          >{{ fmt(row.b, row.suffix) }}</span>
        </div>

        <div
          v-if="share(row)"
          class="flex h-1.5 gap-1"
          aria-hidden="true"
        >
          <span
            class="rounded-full transition-all"
            :style="{ width: `${share(row)!.a}%`, background: colorA }"
          />
          <span
            class="flex-1 rounded-full"
            :style="{ background: colorB }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>
