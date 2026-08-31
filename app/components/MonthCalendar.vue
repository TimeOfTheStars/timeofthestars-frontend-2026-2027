<script setup lang="ts">
import type { Game } from '#shared/types/api'
import type { MonthGrid } from '~/utils/month'
import type { LocationQueryRaw } from 'vue-router'
// Объект компонента, а не строка: автоимпорт Nuxt работает по статическим
// тегам шаблона и динамическое имя не видит — строка отрендерилась бы
// литеральным тегом <NuxtLink>, и ячейка перестала бы быть ссылкой.
import { NuxtLink } from '#components'

/**
 * Месячная сетка матчей.
 *
 * На широком экране матчи стоят прямо в ячейках; на телефоне ячейка шириной
 * около 50px, туда не помещается ничего кроме точек — поэтому там маркеры, а
 * карточки выбранного дня показываются под сеткой. Так же устроен календарь
 * на iPhone, и по той же причине.
 *
 * Навигация ссылками (?month=, ?day=), как везде в проекте: состояние в
 * адресе шарится и корректно ходит по «назад».
 */
const props = defineProps<{
  grid: MonthGrid
  /** выбранный день, YYYY-MM-DD; null — не выбран */
  day: string | null
  today: string
}>()

const route = useRoute()
const { team } = useTeamDirectory()

function monthLink(month: string) {
  // День принадлежит прежнему месяцу — уносить его на новый нельзя
  const query: LocationQueryRaw = { ...route.query, month }
  delete query.day
  return { path: route.path, query }
}

function dayLink(iso: string) {
  return { path: route.path, query: { ...route.query, day: iso } }
}

/**
 * День, чьи карточки показываются под сеткой.
 *
 * Выбранный явно, иначе БЛИЖАЙШИЙ к сегодняшнему день с матчами — не первый
 * в месяце. Открывая август последним числом, логично увидеть матч 30-го, а
 * не 18-го: первый по порядку тут ничем не лучше любого другого.
 */
const activeDay = computed(() => {
  const withGames = props.grid.weeks.flat().filter(c => c.inMonth && c.games.length)
  if (props.day && withGames.some(c => c.iso === props.day)) return props.day
  if (!withGames.length) return null

  const dist = (iso: string) => Math.abs(Date.parse(iso) - Date.parse(props.today))
  return withGames.reduce((best, c) => (dist(c.iso) < dist(best.iso) ? c : best)).iso
})

const activeGames = computed<Game[]>(() =>
  props.grid.weeks.flat().find(c => c.iso === activeDay.value)?.games ?? [],
)

/**
 * Короткая подпись матча в ячейке: счёт у сыгранного, время у будущего.
 *
 * Пустая строка, если ни того ни другого нет. Прочерк тут не годится: время
 * проставлено далеко не у всех матчей (в сентябре 2026 — у двух из десяти), и
 * сетка была бы наполовину в прочерках, которые ничего не сообщают. Без
 * подписи остаются названия команд, а они и есть главное.
 */
function label(g: Game): string {
  if (g.status === 'finished' && g.score_team_a != null && g.score_team_b != null) {
    return `${g.score_team_a}:${g.score_team_b}`
  }
  return ruTime(g.time) ?? ''
}

function teams(g: Game): string {
  const a = team(g.team_a_id)?.name ?? `№${g.team_a_id}`
  const b = team(g.team_b_id)?.name ?? `№${g.team_b_id}`
  return `${a} — ${b}`
}

/** В ячейке помещается три записи, остальные сворачиваются в счётчик. */
const VISIBLE = 3
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between gap-2">
      <NuxtLink
        :to="monthLink(grid.prev)"
        replace
        class="flex size-11 shrink-0 items-center justify-center rounded-lg border border-rule"
        aria-label="Предыдущий месяц"
      >
        <AppIcon
          name="arrowLeft"
          :size="16"
        />
      </NuxtLink>

      <div class="min-w-0 text-center">
        <h3 class="truncate text-lg font-bold first-letter:uppercase">
          {{ grid.title }}
        </h3>
        <p class="text-xs text-muted">
          {{ grid.total ? pluralWith(grid.total, ['матч', 'матча', 'матчей']) : 'матчей нет' }}
        </p>
      </div>

      <NuxtLink
        :to="monthLink(grid.next)"
        replace
        class="flex size-11 shrink-0 items-center justify-center rounded-lg border border-rule"
        aria-label="Следующий месяц"
      >
        <AppIcon
          name="chevronRight"
          :size="16"
        />
      </NuxtLink>
    </div>

    <div class="overflow-hidden rounded-xl border border-rule bg-surface">
      <div class="grid grid-cols-7 border-b border-rule bg-surface-2">
        <span
          v-for="wd in WEEKDAYS"
          :key="wd"
          class="py-1.5 text-center text-[11px] font-bold text-muted uppercase"
        >{{ wd }}</span>
      </div>

      <div
        v-for="(week, wi) in grid.weeks"
        :key="wi"
        class="grid grid-cols-7 border-b border-rule last:border-b-0"
      >
        <component
          :is="cell.games.length ? NuxtLink : 'div'"
          v-for="cell in week"
          :key="cell.iso"
          :to="cell.games.length ? dayLink(cell.iso) : undefined"
          class="min-h-16 border-r border-rule p-1 last:border-r-0 sm:min-h-24"
          :class="[
            cell.inMonth ? '' : 'bg-surface-2/60',
            cell.iso === activeDay && cell.games.length ? 'ring-2 ring-accent ring-inset' : '',
          ]"
        >
          <span
            class="flex size-6 items-center justify-center rounded-full text-xs tabular-nums"
            :class="cell.isToday
              ? 'bg-accent font-bold text-accent-fg'
              : cell.inMonth ? 'font-semibold' : 'text-muted'"
          >{{ cell.day }}</span>

          <!-- Телефон: только маркеры, названия команд в 50px не влезают -->
          <span
            v-if="cell.games.length"
            class="mt-1 flex flex-wrap gap-0.5 px-0.5 sm:hidden"
            aria-hidden="true"
          >
            <span
              v-for="g in cell.games.slice(0, 4)"
              :key="g.id"
              class="size-1.5 rounded-full"
              :class="g.status === 'finished' ? 'bg-accent' : 'bg-rule-strong'"
            />
          </span>

          <!-- Широкий экран: счёт или время плюс команды -->
          <span class="mt-1 hidden flex-col gap-0.5 sm:flex">
            <span
              v-for="g in cell.games.slice(0, VISIBLE)"
              :key="g.id"
              class="flex min-w-0 items-baseline gap-1 rounded px-1 py-0.5 text-[11px] leading-tight"
              :class="g.status === 'finished' ? 'bg-surface-2' : 'bg-accent/10'"
            >
              <span
                v-if="label(g)"
                class="shrink-0 font-bold tabular-nums"
              >{{ label(g) }}</span>
              <span class="min-w-0 truncate text-muted">{{ teams(g) }}</span>
            </span>
            <span
              v-if="cell.games.length > VISIBLE"
              class="px-1 text-[11px] font-semibold text-muted"
            >ещё {{ cell.games.length - VISIBLE }}</span>
          </span>
        </component>
      </div>
    </div>

    <!--
      Карточки выбранного дня — на всех экранах.

      Сначала блок был только на телефоне: на широком экране матчи и так видны
      в ячейках. Но тогда клик по дате на десктопе менял лишь обводку ячейки и
      читался как «ничего не произошло». К тому же в ячейке помещаются только
      счёт и названия, а карточка несёт гербы, стадию и ссылку на протокол.
    -->
    <div
      v-if="activeGames.length"
      class="mt-4"
    >
      <h4 class="mb-2 text-sm font-bold first-letter:uppercase">
        {{ ruDate(activeDay!) }}<span class="font-normal text-muted"> · {{ ruWeekday(activeDay!) }}</span>
      </h4>
      <ul class="space-y-2">
        <li
          v-for="g in activeGames"
          :key="g.id"
        >
          <GameCard
            :game="g"
            show-stage
          />
        </li>
      </ul>
    </div>
  </section>
</template>
