<script setup lang="ts">
import type { CompetitionPlayerWithStats } from '#shared/types/api'

/**
 * Состав со статистикой, сгруппированный по командам.
 *
 * Сервер уже отдал игроков в порядке team_id → number, поэтому группируем
 * потоком, не пересортировывая.
 *
 * На 375px видно: № · Игрок · И · Г · П · О. «Штр» появляется с sm.
 * Позиция — залитый бейдж-буква внутри ячейки имени (экономит ~40px против
 * отдельной колонки), контракт — контурная пилюля «К».
 */
const props = withDefaults(
  defineProps<{
    players: CompetitionPlayerWithStats[]
    /** показать только одну команду */
    teamId?: number | null
    /** скрыть заголовки команд (когда команда и так очевидна) */
    hideTeamHeadings?: boolean
  }>(),
  { hideTeamHeadings: false },
)

const { team } = useTeamDirectory()

const groups = computed(() => {
  const list = props.teamId != null
    ? props.players.filter(p => p.team_id === props.teamId)
    : props.players

  const out: { teamId: number; players: CompetitionPlayerWithStats[] }[] = []
  for (const p of list) {
    const last = out[out.length - 1]
    if (last && last.teamId === p.team_id) last.players.push(p)
    else out.push({ teamId: p.team_id, players: [p] })
  }
  return out
})

const thBase
  = 'border-b border-rule-strong py-2 text-xs font-bold uppercase tracking-wide text-muted'
const tdBase = 'border-b border-rule py-2 text-right tabular-nums'
</script>

<template>
  <div v-if="groups.length">
    <section
      v-for="group in groups"
      :key="group.teamId"
      class="mb-8 last:mb-0"
    >
      <h3
        v-if="!hideTeamHeadings"
        class="mb-2 flex items-center gap-2"
      >
        <TeamName
          :team="team(group.teamId)"
          :team-id="group.teamId"
          :size="30"
        />
        <span class="ml-auto text-xs text-muted">
          {{ pluralWith(group.players.length, ['игрок', 'игрока', 'игроков']) }}
        </span>
      </h3>

      <table class="table-bleed table-fixed border-separate border-spacing-0 text-[13px]">
        <caption class="sr-only">
          Состав команды «{{ team(group.teamId)?.name ?? group.teamId }}» со статистикой
          в этом соревновании
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="w-9 pr-1 pl-4 text-right"
              :class="thBase"
            >
              <span class="sr-only">Игровой номер</span>
              <span aria-hidden="true">№</span>
            </th>
            <th
              scope="col"
              class="pl-2 text-left"
              :class="thBase"
            >
              Игрок
            </th>
            <th
              scope="col"
              class="w-8 text-right"
              :class="thBase"
            >
              <abbr
                title="Игры"
                class="no-underline"
              >И</abbr>
            </th>
            <th
              scope="col"
              class="w-8 text-right"
              :class="thBase"
            >
              <abbr
                title="Голы"
                class="no-underline"
              >Г</abbr>
            </th>
            <th
              scope="col"
              class="w-8 text-right"
              :class="thBase"
            >
              <abbr
                title="Передачи"
                class="no-underline"
              >П</abbr>
            </th>
            <th
              scope="col"
              class="w-9 text-right"
              :class="thBase"
            >
              <abbr
                title="Очки (голы + передачи)"
                class="no-underline"
              >О</abbr>
            </th>
            <th
              scope="col"
              class="hidden w-12 pr-4 text-right sm:table-cell"
              :class="thBase"
            >
              <abbr
                title="Штрафные минуты"
                class="no-underline"
              >Штр</abbr>
            </th>
            <th
              scope="col"
              class="w-2 pr-3 sm:hidden"
              :class="thBase"
            >
              <span class="sr-only">Штрафные минуты</span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, i) in group.players"
            :key="row.player.id"
            :class="i % 2 === 1 && 'bg-surface-2'"
          >
            <td
              class="w-9 pr-1 pl-4 font-bold text-muted"
              :class="tdBase"
            >
              <!-- Номер живёт в заявке и может быть не указан -->
              {{ row.number ?? '—' }}
            </td>

            <th
              scope="row"
              class="border-b border-rule py-1.5 pl-2 text-left font-normal"
            >
              <NuxtLink
                :to="playerPath(row.player)"
                class="flex min-h-12 items-center gap-1.5"
              >
                <!-- Фото 22px: PlayerAvatar сам подставляет монограмму, когда
                     photo_url пуст, а пуст он примерно у половины игроков. -->
                <PlayerAvatar
                  :player="row.player"
                  :size="22"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ row.player.full_name }}</span>
                </span>
                <AppChip
                  v-if="positionShort(row.player.position)"
                  size="sm"
                  variant="neutral"
                  :title="row.player.position ?? undefined"
                >
                  {{ positionShort(row.player.position) }}
                </AppChip>
                <AppChip
                  v-if="row.contract"
                  size="sm"
                  variant="outline"
                  title="Контракт"
                >
                  К
                </AppChip>
              </NuxtLink>
            </th>

            <td :class="[tdBase, 'w-8']">
              {{ row.games }}
            </td>
            <td :class="[tdBase, 'w-8']">
              {{ statNum(row.goals, row.games) }}
            </td>
            <td :class="[tdBase, 'w-8']">
              {{ statNum(row.assists, row.games) }}
            </td>
            <td :class="[tdBase, 'w-9 font-bold']">
              {{ statNum(row.points, row.games) }}
            </td>
            <td :class="[tdBase, 'hidden w-12 pr-4 sm:table-cell']">
              {{ statNum(row.penalties, row.games) }}
            </td>
            <td :class="[tdBase, 'w-4 pr-4 sm:hidden']" />
          </tr>
        </tbody>
      </table>
    </section>

    <p class="mt-3 px-1 text-xs text-muted">
      Прочерк — игрок заявлен, но ещё не выходил на лёд. Ноль — играл и не набрал
      очков. «К» — контракт, «В»/«З»/«Н» — вратарь, защитник, нападающий.
    </p>
  </div>

  <EmptyState
    v-else
    icon="users"
    title="Составы ещё не заявлены"
    hint="Игроки появятся здесь, когда организаторы внесут заявки команд."
  />
</template>
