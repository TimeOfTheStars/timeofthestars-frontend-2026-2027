<script setup lang="ts">
import type { Competition, Game, Page } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'
import type { FilterGroup } from '~/components/FilterSheet.vue'

/**
 * «Матчи» — календарь всей лиги: все соревнования сразу, фильтры в одном листе.
 *
 * ⚠️ `GET /api/v1/games` без фильтра здесь НЕ вызывается: у ручки нет
 * пагинации, и без competition_id она отдаёт все матчи лиги — единственный
 * ответ этого API, растущий неограниченно. Поэтому берём соревнования (их
 * единицы) и запрашиваем матчи каждого веером. Размен осознанный: несколько
 * коротких ответов вместо одного, растущего без предела.
 *
 * Фильтры живут в адресе, а не в модалке. Модалка — способ их собрать; ссылка
 * на отфильтрованный календарь остаётся рабочей и делится.
 */
const route = useRoute()
const router = useRouter()

const filters = computed(() => parseFilters(route.query))

const { data, status, error, refresh } = await usePageData(
  'games-index',
  async ($api) => {
    const comps = await $api<Page<Competition>>(ep.competitions, {
      query: { page: 1, size: 200 },
    })

    // Соревнований единицы, поэтому веер параллельных запросов дешевле
    // одного неограниченного. Упавшее соревнование не должно уронить
    // календарь целиком — отдаём по нему пустой список.
    const perCompetition = await Promise.all(
      comps.items.map(c =>
        $api<Game[]>(ep.competitionGames(c.id)).catch(() => [] as Game[]),
      ),
    )

    return { competitions: comps.items, games: perCompetition.flat() }
  },
)

const calendar = computed(() =>
  buildCalendar(data.value?.games ?? [], data.value?.competitions ?? [], filters.value),
)

/** Название соревнования для ярлыка на карточке — в Game его нет. */
const competitionName = computed(() => {
  const byId = new Map((data.value?.competitions ?? []).map(c => [c.id, c.name]))
  // Когда соревнование выбрано, ярлык на каждой карточке — шум: он и так
  // написан в заголовке над списком.
  return (g: Game) => (filters.value.competition == null ? byId.get(g.competition_id) ?? null : null)
})

const chosenCompetition = computed(() =>
  data.value?.competitions.find(c => c.id === filters.value.competition) ?? null,
)

const groups = computed<FilterGroup[]>(() => [
  {
    key: 'sort',
    label: 'Сначала',
    options: [
      { value: 'upcoming', label: 'Ближайшие' },
      { value: 'results', label: 'Результаты' },
    ],
  },
  {
    key: 'status',
    label: 'Показывать',
    options: [
      { value: '', label: 'Все' },
      { value: 'scheduled', label: 'Предстоящие' },
      { value: 'finished', label: 'Завершённые' },
    ],
  },
  {
    key: 'type',
    label: 'Тип соревнования',
    options: [
      { value: '', label: 'Все' },
      { value: 'championship', label: 'Чемпионаты' },
      { value: 'tournament', label: 'Турниры' },
    ],
  },
  {
    key: 'competition',
    label: 'Соревнование',
    options: [
      { value: '', label: 'Все' },
      ...(data.value?.competitions ?? []).map(c => ({ value: String(c.id), label: c.name })),
    ],
  },
])

const current = computed<Record<string, string>>(() => ({
  sort: filters.value.sort,
  status: filters.value.status ?? '',
  type: filters.value.type ?? '',
  competition: filters.value.competition != null ? String(filters.value.competition) : '',
}))

function applyFilters(next: Record<string, string>) {
  const query: Record<string, string> = {}
  // Значения по умолчанию в адрес не пишем: иначе в ссылке копится мусор
  // вида ?status=&type=, который нечего шарить.
  if (next.sort === 'results') query.sort = 'results'
  if (next.status) query.status = next.status
  if (next.type) query.type = next.type
  if (next.competition) query.competition = next.competition
  router.replace({ path: route.path, query })
}

const title = computed(() => chosenCompetition.value?.name ?? 'Все соревнования')

useHead({ title: 'Матчи' })
useSeoMeta({
  description: 'Календарь и результаты матчей любительской хоккейной лиги «Время звёзд».',
})
</script>

<template>
  <div class="container-page py-5">
    <h1 class="mb-4 text-2xl font-extrabold">
      Матчи
    </h1>

    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="4"
      :height="96"
      rounded="rounded-xl"
    />

    <template v-else-if="data?.competitions.length">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="min-w-0 truncate text-lg font-bold">
          {{ title }}
        </h2>
        <div class="flex items-center gap-2">
          <FilterSheet
            :groups="groups"
            :model-value="current"
            :active-count="activeFilterCount(filters)"
            @apply="applyFilters"
            @reset="router.replace({ path: route.path, query: {} })"
          />
          <RefreshButton
            :pending="status === 'pending'"
            @refresh="refresh()"
          />
        </div>
      </div>

      <!-- Фильтры отсекли всё: это не «матчей нет», а «нет под эти условия» -->
      <EmptyState
        v-if="calendar.isEmpty"
        icon="calendar"
        title="Под эти фильтры матчей нет"
        hint="Попробуйте снять ограничение по типу соревнования или статусу."
      />

      <template v-else>
        <!-- Порядок блоков задаёт фильтр «Сначала». Каждый блок рисуется
             только при непустом списке: пустой «Результаты» под пустыми
             «Предстоящими» — две заглушки подряд. -->
        <div
          v-for="block in (calendar.resultsFirst
            ? [{ key: 'played', title: 'Результаты', games: calendar.played },
               { key: 'upcoming', title: 'Предстоящие матчи', games: calendar.upcoming }]
            : [{ key: 'upcoming', title: 'Предстоящие матчи', games: calendar.upcoming },
               { key: 'played', title: 'Результаты', games: calendar.played }])"
          :key="block.key"
          class="mb-8 last:mb-0"
        >
          <template v-if="block.games.length">
            <h3 class="mb-2 text-sm font-bold">
              {{ block.title }}
            </h3>
            <GameList
              :games="block.games"
              show-stage
              :competition-name="competitionName"
            />
          </template>
        </div>
      </template>
    </template>

    <LoadError
      v-else-if="error"
      :pending="status === 'pending'"
      @retry="refresh()"
    />

    <EmptyState
      v-else
      icon="calendar"
      variant="page"
      title="Матчей пока нет"
      hint="Календарь появится, когда организаторы создадут соревнование и внесут игры."
    />
  </div>
</template>
