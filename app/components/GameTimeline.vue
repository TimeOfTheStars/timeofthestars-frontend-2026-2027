<script setup lang="ts">
import type { GameWithProtocol } from '#shared/types/api'
import type { Timeline, TimelineEvent } from '~/utils/timeline'
// Именно объект компонента, а не строка 'NuxtLink': автоимпорт Nuxt
// работает по статическим тегам в шаблоне и динамическое имя не видит —
// строка отрендерилась бы литеральным тегом <NuxtLink>, а не ссылкой.
import { NuxtLink } from '#components'

/**
 * Хронология матча: вертикальная ось времени по центру, события по сторонам —
 * хозяева слева, гости справа.
 *
 * Иерархия важнее украшений. Гол — то, ради чего страницу открывают, поэтому
 * он единственный получает плашку, счёт и цветной торец. Удаления и смены
 * вратаря намеренно отступают в фон: если оформить всё одинаково, лента
 * станет ровным списком, по которому не пробежаться глазами.
 *
 * Колонку определяет `side`, посчитанный в buildTimeline. Событие с чужим
 * team_id (`side === null`) уходит в левую колонку: колонки для него нет, но
 * молча выбросить его нельзя — голы разошлись бы со счётом в шапке.
 */
const props = defineProps<{
  timeline: Timeline
  game: GameWithProtocol
}>()

const { team } = useTeamDirectory()

const ICON: Record<TimelineEvent['type'], string> = {
  goal: 'puck',
  shootout_goal: 'puck',
  penalty: 'alert',
  goalie_change: 'swap',
}

/**
 * Кружок с иконкой. Залит только гол — остальные обведены, иначе лента
 * превращается в частокол цветных точек и перестаёт различаться.
 */
const MARKER: Record<TimelineEvent['type'], string> = {
  goal: 'bg-accent text-accent-fg',
  shootout_goal: 'border border-accent text-accent',
  penalty: 'border border-flag text-flag',
  goalie_change: 'bg-surface-2 text-muted',
}

/** Победитель серии буллитов. Осмыслен только при равном счёте. */
const shootoutWinner = computed(() =>
  props.game.bullet_win_team_id != null ? team(props.game.bullet_win_team_id) : null,
)

const isGoal = (e: TimelineEvent) => e.type === 'goal' || e.type === 'shootout_goal'

/**
 * Колонка события: 1 — хозяева, 3 — гости, вторая занята осью времени.
 * `side === null` (чужой team_id) кладём влево — лишь бы не потерять событие.
 */
const column = (side: TimelineEvent['side']): number => (side === 'b' ? 3 : 1)

/**
 * Цветной торец плашки гола. Цвет здесь ВТОРИЧЕН: сторону задаёт колонка, а
 * девять слотов crestColor неизбежно дают коллизии — две команды в матче
 * могут получить один цвет, и это не ошибка, просто торец перестаёт различать.
 */
function goalEdge(event: TimelineEvent) {
  if (!isGoal(event) || !event.side) return undefined
  const edge = `3px solid ${crestColor(event.team_id)}`
  return event.side === 'b' ? { borderRight: edge } : { borderLeft: edge }
}
</script>

<template>
  <!-- Без overflow-hidden намеренно: он создаёт scroll-контейнер, и
       появление строк при прокрутке резолвилось бы против самой секции,
       а не против страницы. Скругление низа возвращает класс на подвале. -->
  <section class="rounded-2xl border border-rule bg-surface">
    <!-- Шапка: чьи события в какой колонке. Без неё две колонки не читаются. -->
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
      <span
        class="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold tracking-wider text-muted uppercase"
      >
        ход матча
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

    <!-- Ось времени: одна линия на всю ленту, включая заголовки периодов.
         Плашки времени и периодов непрозрачные — они её и «протыкают». -->
    <div class="relative px-1.5 py-2 sm:px-4">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-rule"
      />

      <template
        v-for="period in timeline.periods"
        :key="period.period ?? 'none'"
      >
        <h3 class="reveal relative py-3 text-center">
          <span
            class="inline-block rounded-full border border-rule bg-surface px-3 py-1 text-[11px] font-bold tracking-wider text-muted uppercase"
          >
            {{ period.label }}
          </span>
        </h3>

        <ul>
          <li
            v-for="event in period.events"
            :key="event.id"
            class="reveal relative grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-1.5 sm:gap-2"
          >
            <div
              class="flex min-w-0 items-center gap-2"
              :class="event.side === 'b' ? 'flex-row' : 'flex-row-reverse'"
              :style="{ gridColumn: column(event.side), gridRow: 1 }"
            >
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-full sm:size-6"
                :class="MARKER[event.type]"
              >
                <AppIcon
                  :name="ICON[event.type]"
                  :size="13"
                  :weight="2"
                />
              </span>

              <div
                class="min-w-0 rounded-lg px-2 py-1.5 sm:px-2.5"
                :class="[
                  isGoal(event) ? 'bg-surface-2' : '',
                  event.side === 'b' ? 'text-left' : 'text-right',
                ]"
                :style="goalEdge(event)"
              >
                <component
                  :is="event.player ? NuxtLink : 'span'"
                  :to="event.player ? playerPath(event.player) : undefined"
                  class="block text-sm leading-snug break-words"
                  :class="[
                    eventPlayerName(event.player).unnamed ? 'text-muted italic' : '',
                    isGoal(event) ? 'font-bold' : 'font-medium text-muted',
                  ]"
                >{{ eventPlayerName(event.player).text }}</component>

                <!-- Ассистенты: только у голов и только если они есть -->
                <p
                  v-if="assistsOf(event).length"
                  class="mt-0.5 text-xs leading-snug text-muted"
                >
                  {{ assistsOf(event).map(a => a.full_name).join(', ') }}
                </p>

                <p
                  v-else-if="event.type === 'penalty'"
                  class="mt-0.5 text-xs leading-snug text-muted"
                >
                  {{ event.penalty_minutes != null ? `${event.penalty_minutes} мин` : 'удаление'
                  }}<template v-if="event.penalty_end_seconds != null"> · до {{ gameClock(event.penalty_end_seconds) }}</template>
                </p>

                <!-- В player приходит тот, кто ВЫШЕЛ на лёд, а не заменённый -->
                <p
                  v-else-if="event.type === 'goalie_change'"
                  class="mt-0.5 text-xs leading-snug text-muted"
                >
                  вышел в ворота
                </p>

                <!-- video_seconds пока не проставлен ни у одного гола,
                     поэтому чаще всего этой кнопки просто нет. -->
                <a
                  v-if="videoAt(game.video_url, event.video_seconds)"
                  :href="videoAt(game.video_url, event.video_seconds)!"
                  target="_blank"
                  rel="noopener"
                  class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
                >
                  <AppIcon
                    name="play"
                    :size="11"
                  />
                  Смотреть
                </a>
              </div>
            </div>

            <div
              class="flex flex-col items-center gap-1"
              :style="{ gridColumn: 2, gridRow: 1 }"
            >
              <span
                class="rounded-full border border-rule bg-surface px-2 py-0.5 text-[15px] font-semibold text-muted tabular-nums"
              >
                {{ gameClock(event.time_seconds) }}
              </span>
              <!-- Счёт показываем только на голах: на удалении он не менялся -->
              <span
                v-if="event.type === 'goal'"
                class="rounded-md bg-surface px-1 text-lg leading-tight font-extrabold text-fg tabular-nums"
              >
                {{ event.scoreA }}:{{ event.scoreB }}
              </span>
            </div>
          </li>
        </ul>
      </template>

      <!-- Серия буллитов. В счёт матча не входит: сумма голов по команде должна
           сходиться со score_team_*, а победа берётся из bullet_win_team_id. -->
      <template v-if="timeline.shootout.length">
        <h3 class="reveal relative py-3 text-center">
          <span
            class="inline-block rounded-full border border-rule bg-surface px-3 py-1 text-[11px] font-bold tracking-wider text-muted uppercase"
          >
            Буллиты
          </span>
        </h3>

        <ul>
          <li
            v-for="event in timeline.shootout"
            :key="event.id"
            class="reveal relative grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-1.5 sm:gap-2"
          >
            <div
              class="flex min-w-0 items-center gap-2"
              :class="event.side === 'b' ? 'flex-row' : 'flex-row-reverse'"
              :style="{ gridColumn: column(event.side), gridRow: 1 }"
            >
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-full sm:size-6"
                :class="MARKER.shootout_goal"
              >
                <AppIcon
                  name="puck"
                  :size="13"
                  :weight="2"
                />
              </span>
              <component
                :is="event.player ? NuxtLink : 'span'"
                :to="event.player ? playerPath(event.player) : undefined"
                class="min-w-0 text-sm font-bold break-words"
                :class="eventPlayerName(event.player).unnamed && 'font-normal text-muted italic'"
              >{{ eventPlayerName(event.player).text }}</component>
            </div>
            <span
              class="rounded-full border border-rule bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted sm:px-2"
              :style="{ gridColumn: 2, gridRow: 1 }"
            >
              буллит
            </span>
          </li>
        </ul>
      </template>
    </div>

    <p
      v-if="timeline.shootout.length && shootoutWinner"
      class="rounded-b-2xl border-t border-rule bg-surface-2 px-4 py-2.5 text-center text-xs text-muted"
    >
      Победа по буллитам — <span class="font-semibold text-fg">{{ shootoutWinner.name }}</span>.
      В счёт матча буллиты не входят.
    </p>
  </section>
</template>
