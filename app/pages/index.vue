<script setup lang="ts">
import type { Competition, Game, Homepage, HomepageBlock, Page, StandingRow } from '#shared/types/api'
import { ep, teamGamesQuery } from '#shared/utils/endpoints'

/**
 * Главная.
 *
 * ⚠️ Штатное состояние /homepage — ПУСТОЕ: блоков может не быть вовсе.
 * Поэтому строить главную только на них нельзя — она была бы пустой
 * страницей. Источник по умолчанию: самое свежее соревнование, и уже из
 * него — лента матчей. Блоки только ДОБАВЛЯЮТ таблицы и сетки сверху.
 *
 * Блоков до трёх, каждый со своим соревнованием, поэтому данные под них
 * грузятся веером в том же Promise.all — водопада не возникает.
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
  const blocks = homepageBlocks(homepage)

  // Матчи нужны каждому блоку — теперь это расписание турнира, — и запасной
  // ленте по умолчанию. Id складываем в множество: featured обычно совпадает
  // с одним из блоков, и без этого мы бы дважды тянули одно и то же.
  const gameIds = [...new Set([
    ...(featured ? [featured.id] : []),
    ...blocks.map(b => b.competition_id),
  ])]
  const standingsIds = blocks.filter(b => b.type === 'standings').map(b => b.competition_id)

  // Оба веера в одном Promise.all: последовательные await дали бы водопад.
  // Упавшее соревнование не должно ронять главную целиком.
  const [gamesList, standingsList] = await Promise.all([
    Promise.all(gameIds.map(id => $api<Game[]>(ep.competitionGames(id)).catch(() => [] as Game[]))),
    Promise.all(standingsIds.map(id => $api<StandingRow[]>(ep.standings(id)).catch(() => [] as StandingRow[]))),
  ])

  const gamesBy = new Map(gameIds.map((id, i) => [id, gamesList[i] ?? []]))
  const standingsBy = new Map(standingsIds.map((id, i) => [id, standingsList[i] ?? []]))

  return {
    featured,
    featuredGames: featured ? gamesBy.get(featured.id) ?? [] : [],
    blocks: blocks.map(block => ({
      block,
      games: gamesBy.get(block.competition_id) ?? [],
      standings: block.type === 'standings' ? standingsBy.get(block.competition_id) ?? [] : [],
      playoff: block.type === 'bracket'
        ? (gamesBy.get(block.competition_id) ?? []).filter(isPlayoff)
        : [],
    })),
    competitions: all.items,
  }
})

/**
 * Блоки турниров: расписание сверху, таблица или сетка снизу.
 *
 * Блок остаётся, если есть хоть что показать — расписание или нижнюю часть.
 * Сетка без матчей плей-офф отсеивается: пустая сетка хуже её отсутствия.
 */
const blocks = computed(() =>
  (data.value?.blocks ?? []).filter(b =>
    b.games.length > 0
    || (b.block.type === 'standings' ? b.standings.length > 0 : b.playoff.length > 0),
  ),
)

/**
 * Лента по умолчанию нужна, только когда блоков нет вовсе: иначе она
 * повторяла бы расписание внутри первого же блока.
 */
const showFeaturedFeed = computed(() => blocks.value.length === 0 && !!data.value?.featured)

/** Подпись блока: своя из админки, иначе название из блока или справочника. */
function titleOf(block: HomepageBlock): string {
  if (block.title || block.competition) return blockTitle(block)
  const found = data.value?.competitions.find(c => c.id === block.competition_id)
  return found?.name ?? blockTitle(block)
}

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
          v-if="showFeaturedFeed && data?.featured"
          class="mb-8"
        >
          <GameCarousel
            :games="data.featuredGames"
            :title="data.featured.name"
            :more-to="competitionPath(data.featured)"
          />
        </section>

        <!--
          Блок турнира: расписание сверху, таблица или сетка снизу.

          Раньше лента матчей была одна на всю главную и относилась к
          «текущему» соревнованию, а таблицы висели отдельно. Когда турниров
          стало несколько, это перестало читаться: непонятно, к какому из них
          относятся матчи. Теперь каждый турнир — самостоятельный блок.

          Заголовок ленты не передаём: название турнира уже стоит в шапке
          блока, а карусель без title оставляет только стрелки.
        -->
        <template
          v-for="(item, i) in blocks"
          :key="item.block.id"
        >
          <!-- Разделитель между турнирами: линия, растворяющаяся к краям.
               Сплошная делила бы страницу жёстче, чем нужно, — блоки
               соседние, а не разные разделы. -->
          <div
            v-if="i > 0"
            aria-hidden="true"
            class="mb-8 h-px bg-gradient-to-r from-transparent via-rule-strong to-transparent"
          />

          <section class="mb-8">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 class="min-w-0 truncate text-lg font-bold">
                {{ titleOf(item.block) }}
              </h2>
              <NuxtLink
                :to="competitionPath({ id: item.block.competition_id })"
                class="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent"
              >
                Всё
                <AppIcon
                  name="chevronRight"
                  :size="15"
                />
              </NuxtLink>
            </div>

            <GameCarousel
              v-if="item.games.length"
              :games="item.games"
              class="mb-6"
            />

            <template v-if="item.block.type === 'standings' ? item.standings.length : item.playoff.length">
              <h3 class="mb-2 text-xs font-bold tracking-wide text-muted uppercase">
                {{ item.block.type === 'bracket' ? 'Плей-офф' : 'Турнирная таблица' }}
              </h3>
              <StandingsTable
                v-if="item.block.type === 'standings'"
                :rows="item.standings"
                :highlight-team-id="myTeamId"
              />
              <PlayoffBracket
                v-else
                :games="item.playoff"
              />
            </template>
          </section>
        </template>

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
