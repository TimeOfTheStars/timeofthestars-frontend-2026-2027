<script setup lang="ts">
import type { Game, Team } from '#shared/types/api'
import { ep, teamGamesQuery } from '#shared/utils/endpoints'

/** Матчи и заявки команды загружаются независимо друг от друга. */
const route = useRoute()

definePageMeta({
  validate: to => parseId(to.params.id) != null,
})

const id = computed(() => parseId(route.params.id)!)

const { data, status, error, refresh } = await usePageData(
  () => `team:${id.value}`,
  async ($api) => {
    const [team, games, rosters] = await Promise.all([
      $api<Team>(ep.team(id.value)),
      $api<Game[]>(ep.games, { query: teamGamesQuery(id.value) }),
      loadTeamRosters($api, id.value),
    ])
    return { team, games, rosters }
  },
  { watch: [id] },
)

const team = computed(() => data.value?.team ?? null)
const split = computed(() => splitGames(data.value?.games ?? []))
const { myTeamId, toggle } = useMyTeam()
const isMine = computed(() => myTeamId.value === team.value?.id)

// Красивый URL — /teams/{slug}-{id}. Если пришли по устаревшему slug,
// уводим на канонический адрес: 301, чтобы не плодить дубли в поиске.
watchEffect(() => {
  const t = team.value
  if (!t || !import.meta.server) return
  const canonical = teamPath(t)
  if (route.path !== canonical) {
    navigateTo(canonical, { redirectCode: 301, replace: true })
  }
})

const TAB_TITLE: Record<string, string> = { games: 'Матчи', roster: 'Составы' }
const segments = computed(() => [
  { key: 'games', label: 'Матчи', count: data.value?.games.length || null },
  { key: 'roster', label: 'Составы', count: data.value?.rosters.length || null },
])
const tab = computed(() => {
  const t = String(route.query.tab ?? '')
  return segments.value.some(s => s.key === t) ? t : 'games'
})

/**
 * Выбранный состав — в адресе (?competition=, как на странице печати).
 * По умолчанию — текущее соревнование: идущее сейчас, иначе последнее
 * начавшееся, иначе ближайшее. Чужой id тихо даёт выбор по умолчанию.
 */
const rosterCompetitionId = computed(() => {
  const rosters = data.value?.rosters ?? []
  const n = Number(route.query.competition)
  if (rosters.some(r => r.competitionId === n)) return n
  return pickCurrentCompetition(rosters.map(r => r.competition))?.id ?? null
})

const rosterEntry = computed(() =>
  data.value?.rosters.find(r => r.competitionId === rosterCompetitionId.value) ?? null,
)

function rosterLink(id: number) {
  return { path: route.path, query: { ...route.query, competition: String(id) } }
}

useHead(() => ({ title: team.value?.name ?? 'Команда' }))
useSeoMeta({
  description: () =>
    team.value
      ? `${team.value.name}${team.value.city ? `, ${team.value.city}` : ''} — матчи, составы и статистика в лиге «Время звёзд».`
      : '',
})
</script>

<template>
  <div class="container-page py-5">
    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="5"
      :height="44"
      rounded="rounded-lg"
    />

    <template v-else-if="team">
      <header class="mb-5 flex items-start gap-3">
        <TeamCrest
          :team="team"
          :size="64"
        />
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-extrabold sm:text-2xl">
            {{ team.name }}
          </h1>
          <p
            v-if="team.city"
            class="mt-1 flex items-center gap-1 text-sm text-muted"
          >
            <AppIcon
              name="mapPin"
              :size="14"
            />
            {{ team.city }}
          </p>
        </div>
      </header>

      <!-- «Моя команда»: подсвечивается в таблице и выносится на главную -->
      <button
        type="button"
        class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors"
        :class="isMine ? 'border-accent bg-accent text-accent-fg' : 'border-rule text-muted'"
        :aria-pressed="isMine"
        @click="toggle(team.id)"
      >
        <AppIcon
          name="star"
          :size="16"
        />
        {{ isMine ? 'Моя команда' : 'Отметить как мою' }}
      </button>

      <SegmentLinks
        :items="segments"
        :current="tab"
        class="mb-5"
      />

      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-bold">
          {{ TAB_TITLE[tab] }}
        </h2>
        <RefreshButton
          :pending="status === 'pending'"
          @refresh="refresh()"
        />
      </div>

      <section v-if="tab === 'games'">
        <div v-if="split.upcoming.length">
          <h3 class="mb-2 text-sm font-bold">
            Предстоящие матчи
          </h3>
          <GameList
            :games="split.upcoming"
            show-stage
          />
        </div>

        <div :class="split.upcoming.length > 0 && 'mt-8'">
          <h3 class="mb-2 text-sm font-bold">
            Результаты
          </h3>
          <GameList
            :games="split.played"
            show-stage
            empty-title="Сыгранных матчей пока нет"
          />
        </div>
      </section>

      <section v-else-if="tab === 'roster'">
        <!-- Отдельная страница под печать: там состав без навигации сайта,
             с уменьшенными фото и кнопкой сборки PDF. -->
        <template v-if="rosterEntry">
          <NuxtLink
            :to="{ path: `${teamPath(data!.team)}/squad`, query: { competition: String(rosterEntry.competitionId) } }"
            class="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule bg-surface px-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
          >
            <AppIcon
              name="file"
              :size="16"
            />
            Скачать состав
          </NuxtLink>

          <!--
            Переключатель соревнований, как переключатель команд на странице
            турнира: раньше составы шли стопкой, и до нужного приходилось
            долго листать. На узком экране — строка с горизонтальной прокруткой.
          -->
          <div
            v-if="data!.rosters.length > 1"
            class="table-bleed mb-4 overflow-x-auto sm:overflow-visible"
            role="group"
            aria-label="Соревнование"
          >
            <div class="flex min-w-max gap-1.5 px-4 sm:min-w-0 sm:flex-wrap sm:px-0">
              <NuxtLink
                v-for="entry in data!.rosters"
                :key="entry.competitionId"
                :to="rosterLink(entry.competitionId)"
                replace
                class="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold whitespace-nowrap transition-colors"
                :class="rosterCompetitionId === entry.competitionId
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-rule text-muted hover:text-fg'"
                :aria-current="rosterCompetitionId === entry.competitionId ? 'true' : undefined"
              >
                {{ entry.competition.name }}
                <span class="font-semibold tabular-nums opacity-70">{{ entry.players.length }}</span>
              </NuxtLink>
            </div>
          </div>

          <div class="mb-2 flex items-center justify-between gap-3">
            <NuxtLink
              :to="competitionPath(rosterEntry.competition)"
              class="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-sm font-bold text-accent"
            >
              <span class="truncate">{{ rosterEntry.competition.name }}</span>
              <AppIcon
                name="chevronRight"
                :size="15"
                class="shrink-0"
              />
            </NuxtLink>
            <span class="shrink-0 text-xs text-muted">
              {{ pluralWith(rosterEntry.players.length, ['игрок', 'игрока', 'игроков']) }}
            </span>
          </div>

          <RosterTable
            :players="rosterEntry.players"
            hide-team-headings
          />
        </template>

        <EmptyState
          v-else
          icon="users"
          title="Составов пока нет"
          hint="Состав существует в рамках соревнования: он появится, когда команду заявят и внесут игроков."
        />
      </section>
    </template>

    <!-- Запрос упал и показать нечего -->
    <LoadError
      v-else-if="error"
      :pending="status === 'pending'"
      @retry="refresh()"
    />
  </div>
</template>
