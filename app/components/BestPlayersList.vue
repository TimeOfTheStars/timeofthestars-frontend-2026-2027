<script setup lang="ts">
import type { BestPlayer, CompetitionPlayerWithStats } from '#shared/types/api'

/**
 * Лучшие игроки соревнования.
 *
 * ⚠️ BestPlayer.team_id сервер ВСЕГДА отдаёт null (подводный камень №7),
 * поэтому команду ищем по составу соревнования, который на этой странице
 * уже загружен — лишнего запроса не делаем.
 *
 * Здесь учитываются ВСЕ стадии, включая плей-офф, а в турнирной таблице —
 * только регулярка. Числа закономерно не сходятся, поэтому об этом сказано
 * прямо в подписи: иначе выглядит как ошибка.
 */
const props = defineProps<{
  players: BestPlayer[]
  /** состав соревнования — источник команды и игрового номера */
  roster: CompetitionPlayerWithStats[]
}>()

const { team } = useTeamDirectory()

const rosterByPlayer = computed(() => {
  const m = new Map<number, CompetitionPlayerWithStats>()
  for (const r of props.roster) m.set(r.player.id, r)
  return m
})
</script>

<template>
  <div v-if="players.length">
    <ol class="space-y-2">
      <li
        v-for="(row, i) in players"
        :key="row.player.id"
      >
        <NuxtLink
          :to="playerPath(row.player)"
          class="flex items-center gap-3 rounded-xl border border-rule bg-surface p-3 transition-colors hover:border-rule-strong"
        >
          <span
            class="w-5 shrink-0 text-center text-sm font-bold tabular-nums"
            :class="i === 0 ? 'text-flag' : 'text-muted'"
            aria-hidden="true"
          >{{ i + 1 }}</span>

          <PlayerAvatar
            :player="row.player"
            :size="40"
          />

          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold">{{ row.player.full_name }}</span>
            <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <template v-if="rosterByPlayer.get(row.player.id)">
                <span class="truncate">
                  {{ team(rosterByPlayer.get(row.player.id)!.team_id)?.name
                    ?? `Команда №${rosterByPlayer.get(row.player.id)!.team_id}` }}
                </span>
                <span
                  v-if="rosterByPlayer.get(row.player.id)!.number != null"
                  aria-hidden="true"
                >· №{{ rosterByPlayer.get(row.player.id)!.number }}</span>
              </template>
              <span v-else-if="row.player.position">{{ row.player.position }}</span>
            </span>
          </span>

          <span class="shrink-0 text-right">
            <span class="block text-lg leading-none font-bold tabular-nums">{{ row.points }}</span>
            <span class="mt-0.5 block text-xs text-muted tabular-nums">
              {{ row.goals }}+{{ row.assists }}
            </span>
          </span>
        </NuxtLink>
      </li>
    </ol>

    <p class="mt-3 px-1 text-xs text-muted">
      Очки = голы + передачи. Учитываются все стадии, включая плей-офф, — поэтому
      цифры здесь и в турнирной таблице считаются по-разному.
    </p>
  </div>

  <EmptyState
    v-else
    icon="star"
    title="Пока некого показать"
    hint="Блок заполнится, когда в протоколах матчей появятся результаты игроков."
  />
</template>
