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

  // Названия соревнований запрашивать больше не нужно: блок несёт вложенное
  // competition. Запасной путь со старых полей его не заполняет, поэтому
  // подпись там падает на справочник соревнований ниже.
  const [featuredGames, ...blockData] = await Promise.all([
    featured ? $api<Game[]>(ep.competitionGames(featured.id)) : Promise.resolve([] as Game[]),
    ...blocks.map(b =>
      b.type === 'standings'
        ? $api<StandingRow[]>(ep.standings(b.competition_id)).catch(() => null)
        // Сетке нужны матчи соревнования — из них же берутся стадии плей-офф.
        : $api<Game[]>(ep.competitionGames(b.competition_id)).catch(() => null),
    ),
  ])

  return {
    featured,
    featuredGames,
    blocks: blocks.map((block, i) => ({ block, payload: blockData[i] ?? null })),
    competitions: all.items,
  }
})

/**
 * Блоки, по которым реально есть что показать. Сетка отсеивается, если в
 * соревновании нет ни одного матча плей-офф: пустая сетка хуже её отсутствия.
 */
const blocks = computed(() =>
  (data.value?.blocks ?? [])
    .map(({ block, payload }) => ({
      block,
      standings: block.type === 'standings' ? (payload as StandingRow[] | null) ?? [] : [],
      playoff: block.type === 'bracket' ? ((payload as Game[] | null) ?? []).filter(isPlayoff) : [],
    }))
    .filter(b => (b.block.type === 'standings' ? b.standings.length > 0 : b.playoff.length > 0)),
)

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
          v-if="data?.featured"
          class="mb-8"
        >
          <GameCarousel
            :games="data.featuredGames"
            :title="data.featured.name"
            :more-to="competitionPath(data.featured)"
          />
        </section>

        <!--
          Блоки из админки: до трёх таблиц и сеток, порядок задаёт position.
          Раньше это были два жёстко зашитых блока — одна таблица и одна
          сетка; теперь их набор и порядок настраиваются, поэтому цикл.
        -->
        <section
          v-for="item in blocks"
          :key="item.block.id"
          class="mb-8"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="min-w-0 truncate text-lg font-bold">
              <template v-if="item.block.type === 'bracket'">Плей-офф · </template>{{ titleOf(item.block) }}
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

          <StandingsTable
            v-if="item.block.type === 'standings'"
            :rows="item.standings"
            :highlight-team-id="myTeamId"
          />
          <PlayoffBracket
            v-else
            :games="item.playoff"
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
