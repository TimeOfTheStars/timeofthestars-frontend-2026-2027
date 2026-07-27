<script setup lang="ts">
import type {
  BestPlayer,
  Competition,
  CompetitionPlayerWithStats,
  Game,
  StandingRow,
} from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Страница соревнования — центральный экран сайта.
 *
 * Разделы — ССЫЛКАМИ (?tab=…), а не компонентом-табами: шарятся в мессенджер,
 * индексируются, работают без JS, корректно ведут себя по «назад».
 *
 * Всё грузится одним useAsyncData в Promise.all. best-players запрашиваем
 * всегда, не глядя на show_best_players: узнать флаг можно только из ответа по
 * соревнованию, а ждать его — это водопад ради дешёвого агрегата.
 */
const route = useRoute()

definePageMeta({
  // Отбиваем мусорный параметр ДО любого сетевого запроса
  validate: to => parseId(to.params.id) != null,
})

const id = computed(() => parseId(route.params.id)!)

const { data, status, error, refresh } = await usePageData(
  () => `competition:${id.value}`,
  async ($api) => {
    const [competition, standings, roster, games, best] = await Promise.all([
      $api<Competition>(ep.competition(id.value)),
      $api<StandingRow[]>(ep.standings(id.value)),
      $api<CompetitionPlayerWithStats[]>(ep.roster(id.value)),
      $api<Game[]>(ep.competitionGames(id.value)),
      $api<BestPlayer[]>(ep.bestPlayers(id.value), { query: { limit: 10 } }),
    ])
    return { competition, standings, roster, games, best }
  },
  { watch: [id] },
)

const competition = computed(() => data.value?.competition ?? null)
const games = computed(() => data.value?.games ?? [])
const playoffGames = computed(() => games.value.filter(isPlayoff))
const split = computed(() => splitGames(games.value))
const played = computed(() => split.value.played)
const upcoming = computed(() => split.value.upcoming)

const { team } = useTeamDirectory()
const { myTeamId } = useMyTeam()

const winner = computed(() => team(competition.value?.winner_team_id ?? null))

/**
 * Плей-офф показываем только если матчи ЕСТЬ. show_playoff_bracket === true
 * при нуле матчей — штатное состояние любого чемпионата первые месяцы.
 */
const showPlayoff = computed(
  () => !!competition.value?.show_playoff_bracket && playoffGames.value.length > 0,
)
const showBest = computed(
  () => !!competition.value?.show_best_players && (data.value?.best.length ?? 0) > 0,
)

const segments = computed(() => {
  const out = [
    { key: 'standings', label: 'Таблица' },
    { key: 'schedule', label: 'Календарь', count: games.value.length || null },
    { key: 'roster', label: 'Составы', count: data.value?.roster.length || null },
  ]
  if (showBest.value) out.push({ key: 'best', label: 'Лучшие' })
  if (showPlayoff.value) out.push({ key: 'playoff', label: 'Плей-офф' })
  return out
})

const tab = computed(() => {
  const t = String(route.query.tab ?? '')
  return segments.value.some(s => s.key === t) ? t : 'standings'
})

const SECTION_TITLE: Record<string, string> = {
  standings: 'Турнирная таблица',
  schedule: 'Календарь и результаты',
  roster: 'Составы команд',
  best: 'Лучшие игроки',
  playoff: 'Плей-офф',
}

useHead(() => ({ title: competition.value?.name ?? 'Соревнование' }))
useSeoMeta({
  description: () =>
    competition.value
      ? `${competition.value.name}: турнирная таблица, календарь и результаты матчей, составы команд и статистика игроков.`
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
      :rows="6"
      :height="40"
      rounded="rounded-lg"
    />

    <template v-else-if="competition">
      <!-- Шапка соревнования -->
      <header class="mb-5 flex gap-3">
        <CompetitionLogo
          :src="competition.logo_url"
          :size="56"
        />
        <div class="min-w-0">
          <AppChip
            variant="outline"
          >
            {{ COMPETITION_TYPE_LABEL[competition.type] }}
          </AppChip>
          <h1 class="mt-1.5 text-xl font-extrabold sm:text-2xl">
            {{ competition.name }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ ruDateRange(competition.start_date, competition.end_date) }}
          </p>
          <p
            v-if="competition.location"
            class="mt-0.5 flex items-center gap-1 text-sm text-muted"
          >
            <AppIcon
              name="mapPin"
              :size="14"
            />
            <span class="min-w-0 truncate">{{ competition.location }}</span>
          </p>
        </div>
      </header>

      <!-- Победитель: показываем только когда winner_team_id заполнен -->
      <NuxtLink
        v-if="winner"
        :to="teamPath(winner)"
        class="mb-5 flex items-center gap-3 rounded-xl border border-accent bg-surface p-3"
      >
        <AppIcon
          name="trophy"
          :size="24"
          class="text-accent"
        />
        <span class="min-w-0 flex-1">
          <span class="block text-xs font-semibold text-muted uppercase">Победитель</span>
          <span class="block truncate font-bold">{{ winner.name }}</span>
        </span>
        <TeamCrest
          :team="winner"
          :size="36"
        />
      </NuxtLink>

      <SegmentLinks
        :items="segments"
        :current="tab"
        class="mb-5"
      />

      <!-- Заголовок раздела и «Обновить» в одной строке: кнопка не должна
           занимать отдельный ряд, а разделу нужен видимый заголовок -->
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-bold">
          {{ SECTION_TITLE[tab] }}
        </h2>
        <RefreshButton
          :pending="status === 'pending'"
          @refresh="refresh()"
        />
      </div>

      <!-- Таблица -->
      <section v-if="tab === 'standings'">
        <StandingsTable
          :rows="data!.standings"
          :highlight-team-id="myTeamId"
        />
      </section>

      <!-- Календарь и результаты -->
      <section v-else-if="tab === 'schedule'">
        <div v-if="upcoming.length">
          <h3 class="mb-2 text-sm font-bold">
            Предстоящие матчи
          </h3>
          <GameList
            :games="upcoming"
            show-stage
          />
        </div>

        <div :class="upcoming.length > 0 && 'mt-8'">
          <h3 class="mb-2 text-sm font-bold">
            Результаты
          </h3>
          <GameList
            :games="played"
            show-stage
            empty-title="Сыгранных матчей пока нет"
            empty-hint="Результаты появятся, когда организаторы внесут счёт."
          />
        </div>
      </section>

      <!-- Составы -->
      <section v-else-if="tab === 'roster'">
        <RosterTable :players="data!.roster" />
      </section>

      <!-- Лучшие игроки -->
      <section v-else-if="tab === 'best'">
        <BestPlayersList
          :players="data!.best"
          :roster="data!.roster"
        />
      </section>

      <!-- Сетка плей-офф -->
      <section v-else-if="tab === 'playoff'">
        <PlayoffBracket
          :games="playoffGames"
          :winner-team-id="competition.winner_team_id"
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
