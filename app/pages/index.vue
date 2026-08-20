<script setup lang="ts">
import type { Competition, Game, Homepage, Page, StandingRow } from '#shared/types/api'
import { ep, teamGamesQuery } from '#shared/utils/endpoints'

/**
 * Главная.
 *
 * ⚠️ Штатное состояние /homepage — ПУСТОЕ: в живой базе там
 * show_bracket: false, show_standings: false и оба id null. Поэтому строить
 * главную только на этих флагах нельзя — она была бы пустой страницей.
 *
 * Источник по умолчанию: самое свежее соревнование (сервер сортирует
 * start_date ↓, id ↓ — берём первый элемент), и уже из него — ближайшие матчи
 * и последние результаты. Флаги /homepage только ДОБАВЛЯЮТ блоки сверху,
 * и проверяются вместе с id: админка допускает true при null.
 */
const { data, status, error, refresh } = await usePageData('home', async ($api) => {
  const [homepage, all] = await Promise.all([
    $api<Homepage>(ep.homepage),
    // size=200, а не 1: выбрать ТЕКУЩЕЕ соревнование по одному элементу нельзя —
    // сервер сортирует start_date ↓, и первым идёт самое позднее, то есть
    // будущее. Соревнований единицы, полный список ничего не стоит.
    $api<Page<Competition>>(ep.competitions, { query: { page: 1, size: 200 } }),
  ])

  const featured = pickCurrentCompetition(all.items)

  // Оба условия — и флаг, и id
  const standingsId
    = homepage.show_standings && homepage.standings_competition_id != null
      ? homepage.standings_competition_id
      : null
  const bracketId
    = homepage.show_bracket && homepage.bracket_competition_id != null
      ? homepage.bracket_competition_id
      : null

  // Названия соревнований берём отдельными запросами: ни в standings, ни в
  // games его нет, а блок без названия не сообщает, к чему относятся цифры —
  // таблица и сетка на главной вполне могут быть от РАЗНЫХ соревнований.
  const [featuredGames, standings, standingsComp, bracketGames, bracketComp] = await Promise.all([
    featured ? $api<Game[]>(ep.competitionGames(featured.id)) : Promise.resolve([]),
    standingsId ? $api<StandingRow[]>(ep.standings(standingsId)) : Promise.resolve(null),
    standingsId ? $api<Competition>(ep.competition(standingsId)) : Promise.resolve(null),
    bracketId ? $api<Game[]>(ep.competitionGames(bracketId)) : Promise.resolve(null),
    bracketId ? $api<Competition>(ep.competition(bracketId)) : Promise.resolve(null),
  ])

  return { featured, featuredGames, standings, standingsComp, bracketGames, bracketComp }
})

const playoffGames = computed(() => (data.value?.bracketGames ?? []).filter(isPlayoff))

// «Моя команда» живёт в localStorage, поэтому известна только на клиенте.
const { myTeamId } = useMyTeam()
const { team } = useTeamDirectory()
const { $api } = useNuxtApp()

const myGames = ref<Game[] | null>(null)

watch(myTeamId, async (id) => {
  if (!id) {
    myGames.value = null
    return
  }
  try {
    myGames.value = await $api<Game[]>(ep.games, { query: teamGamesQuery(id) })
  }
  catch {
    myGames.value = null
  }
}, { immediate: true })

const mySplit = computed(() => splitGames(myGames.value ?? []))
const myNext = computed(() => mySplit.value.upcoming[0] ?? null)
const myLast = computed(() => [...mySplit.value.played].reverse()[0] ?? null)

useHead({ title: 'Время звёзд — любительская хоккейная лига' })
useSeoMeta({
  title: 'Время звёзд — любительская хоккейная лига',
  description:
    'Регулярные хоккейные игры и турниры: турнирные таблицы, календарь и результаты матчей, составы команд и статистика игроков.',
})
</script>

<template>
  <div>
    <!--
      Заставка идёт ДО состояний загрузки и ошибки намеренно: она статична
      и не зависит от API, поэтому первый экран рисуется всегда — и пока
      данные едут, и когда пришли устаревшие. (Полный отказ API — другое
      дело: usePageData бросает 503, и страницу перехватывает error.vue.)
    -->
    <HomeHero />

    <!-- scroll-mt-header: якорь не должен уезжать под липкую шапку -->
    <div
      id="content"
      class="container-page scroll-mt-header py-8"
    >
      <StaleNotice
        v-if="error && data"
        :pending="status === 'pending'"
        @refresh="refresh()"
      />

      <AppSkeleton
        v-if="status === 'pending' && !data"
        :rows="5"
        :height="72"
        rounded="rounded-xl"
      />

      <template v-else-if="data">
        <!-- Моя команда: главный вопрос пользователя — «где мои» -->
        <section
          v-if="myTeamId && team(myTeamId)"
          class="mb-8"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="text-lg font-bold">
              Моя команда
            </h2>
            <NuxtLink
              :to="teamPath(team(myTeamId)!)"
              class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent"
            >
              Открыть
              <AppIcon
                name="chevronRight"
                :size="15"
              />
            </NuxtLink>
          </div>

          <div class="mb-3 flex items-center gap-3 rounded-xl border border-accent bg-surface p-3">
            <TeamCrest
              :team="team(myTeamId)"
              :size="44"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-bold">{{ team(myTeamId)!.name }}</span>
              <span
                v-if="team(myTeamId)!.city"
                class="block truncate text-xs text-muted"
              >{{ team(myTeamId)!.city }}</span>
            </span>
          </div>

          <div class="space-y-2">
            <div v-if="myNext">
              <p class="mb-1.5 text-xs font-bold text-muted uppercase">
                Следующий матч
              </p>
              <GameCard
                :game="myNext"
                show-stage
              />
            </div>
            <div v-if="myLast">
              <p class="mb-1.5 text-xs font-bold text-muted uppercase">
                Последний матч
              </p>
              <GameCard
                :game="myLast"
                show-stage
              />
            </div>
          </div>
        </section>

        <!--
          Матчи идут выше таблицы и сетки: на главную заходят посмотреть счёт
          и когда следующая игра, а не изучать распределение мест.

          Одна лента вместо двух списков «ближайшие» / «последние»: она
          открывается на «сейчас» — на последнем сыгранном матче, — так свежий
          результат и следующая игра оказываются рядом, в одном движении
          большого пальца. Заголовок и стрелки рисует сама карусель.
        -->
        <section
          v-if="data?.featured"
          class="mb-8"
        >
          <GameCarousel
            :games="data.featuredGames"
            :title="data.featured.name"
            :more-to="competitionPath(data.featured)"
          />
        </section>

        <!-- Блок из админки: таблица выбранного соревнования -->
        <section
          v-if="data?.standings?.length"
          class="mb-8"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="min-w-0 truncate text-lg font-bold">
              {{ data.standingsComp?.name ?? 'Турнирная таблица' }}
            </h2>
            <NuxtLink
              v-if="data.standingsComp"
              :to="competitionPath(data.standingsComp)"
              class="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent"
            >
              Всё
              <AppIcon
                name="chevronRight"
                :size="15"
              />
            </NuxtLink>
          </div>
          <StandingsTable
            :rows="data.standings"
            :highlight-team-id="myTeamId"
          />
        </section>

        <!-- Блок из админки: сетка плей-офф -->
        <section
          v-if="playoffGames.length"
          class="mb-8"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="min-w-0 truncate text-lg font-bold">
              Плей-офф<template v-if="data.bracketComp"> · {{ data.bracketComp.name }}</template>
            </h2>
            <NuxtLink
              v-if="data.bracketComp"
              :to="competitionPath(data.bracketComp)"
              class="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent"
            >
              Всё
              <AppIcon
                name="chevronRight"
                :size="15"
              />
            </NuxtLink>
          </div>
          <PlayoffBracket
            :games="playoffGames"
            :winner-team-id="data.bracketComp?.winner_team_id"
          />
        </section>

        <template v-if="data?.featured">
          <NuxtLink
            to="/competitions"
            class="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-rule bg-surface font-semibold"
          >
            <AppIcon
              name="trophy"
              :size="18"
            />
            Все соревнования
          </NuxtLink>
        </template>

        <!-- Совсем нет данных: лига только создаётся -->
        <EmptyState
          v-else
          icon="trophy"
          variant="page"
          title="Соревнования ещё не созданы"
          hint="Как только организаторы добавят чемпионат или турнир, здесь появятся таблица, календарь и результаты."
        />
      </template>

      <!-- Запрос упал и показать нечего. Без этого блока страница отдавала бы
           пустое тело с кодом 200 — проверено на остановленном API. -->
      <LoadError
        v-else
        :pending="status === 'pending'"
        @retry="refresh()"
      />
    </div>
  </div>
</template>
