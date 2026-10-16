<script setup lang="ts">
import type { LeaderRow } from '~/utils/leaders'

/**
 * Одна колонка рейтинга: «Снайперы», «Бомбардиры» или «Ассистенты».
 *
 * Компактнее карточек на всю ширину: на десктопе три колонки стоят рядом,
 * поэтому аватар меньше, а команда и номер — второй строкой под ФИО.
 */
const props = defineProps<{
  title: string
  /** короткая подпись показателя в шапке колонки: «Г», «О», «П» */
  unit: string
  /** расшифровка подписи для abbr: «Голы» */
  unitTitle: string
  rows: LeaderRow[]
  /** показать под значением разбивку «голы+передачи» (для бомбардиров) */
  showBreakdown?: boolean
}>()

const { team } = useTeamDirectory()

/** Место выводим только у первого из равных: столбик «1, 2, 2, 4» читается хуже */
function showPlace(i: number) {
  return i === 0 || props.rows[i - 1]!.place !== props.rows[i]!.place
}
</script>

<template>
  <section class="rounded-xl border border-rule bg-surface p-3">
    <h3 class="mb-2 flex items-baseline justify-between gap-2 px-1">
      <span class="font-bold">{{ title }}</span>
      <abbr
        :title="unitTitle"
        class="text-xs font-bold tracking-wide text-muted uppercase no-underline"
      >{{ unit }}</abbr>
    </h3>

    <ol
      v-if="rows.length"
      class="space-y-0.5"
    >
      <li
        v-for="(item, i) in rows"
        :key="`${item.row.player.id}-${item.row.team_id}`"
      >
        <NuxtLink
          :to="playerPath(item.row.player)"
          class="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2"
        >
          <span
            class="w-5 shrink-0 text-center text-sm font-bold tabular-nums"
            :class="item.place === 1 ? 'text-flag' : 'text-muted'"
          >
            <span class="sr-only">Место </span>
            <template v-if="showPlace(i)">{{ item.place }}</template>
          </span>

          <PlayerAvatar
            :player="item.row.player"
            :size="28"
          />

          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold">{{ item.row.player.full_name }}</span>
            <span class="flex min-w-0 items-center gap-1 text-xs text-muted">
              <span class="truncate">
                {{ team(item.row.team_id)?.name ?? `Команда №${item.row.team_id}` }}
              </span>
              <span
                v-if="item.row.number != null"
                class="shrink-0"
                aria-hidden="true"
              >· №{{ item.row.number }}</span>
            </span>
          </span>

          <span class="shrink-0 text-right">
            <span class="block text-base leading-none font-bold tabular-nums">{{ item.value }}</span>
            <span
              v-if="showBreakdown"
              class="mt-0.5 block text-xs text-muted tabular-nums"
            >{{ item.row.goals }}+{{ item.row.assists }}</span>
          </span>
        </NuxtLink>
      </li>
    </ol>

    <p
      v-else
      class="px-1 py-2 text-sm text-muted"
    >
      Пока нет
    </p>
  </section>
</template>
