<script setup lang="ts">
import type { Competition, Game, Page } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * «Матчи» — один тап от любого экрана до любого счёта.
 *
 * ⚠️ `GET /api/v1/games` без фильтра здесь НЕ вызывается: у ручки нет
 * пагинации, и без competition_id она отдаёт все матчи лиги — единственный
 * ответ этого API, растущий неограниченно. Поэтому сначала берём соревнования
 * (их единицы), затем матчи выбранного.
 */
const route = useRoute()

const compId = computed(() => {
  const n = Number(route.query.competition)
  return Number.isSafeInteger(n) && n > 0 ? n : null
})

const { data, status, error, refresh } = await usePageData(
  () => `games-index:${compId.value ?? 'default'}`,
  async ($api) => {
    // Когда соревнование задано в URL — грузим параллельно, без водопада
    const [comps, known] = await Promise.all([
      $api<Page<Competition>>(ep.competitions, { query: { page: 1, size: 200 } }),
      compId.value ? $api<Game[]>(ep.competitionGames(compId.value)) : Promise.resolve(null),
    ])

    // Не comps.items[0]: сервер сортирует start_date ↓, и первым идёт
    // соревнование с самой поздней датой старта, то есть будущее
    const chosen = compId.value ?? pickCurrentCompetition(comps.items)?.id ?? null
    const games = known ?? (chosen ? await $api<Game[]>(ep.competitionGames(chosen)) : [])

    return { competitions: comps.items, chosen, games }
  },
  { watch: [compId] },
)

const split = computed(() => splitGames(data.value?.games ?? []))
const chosenCompetition = computed(() =>
  data.value?.competitions.find(c => c.id === data.value?.chosen) ?? null,
)

const segments = computed(() =>
  (data.value?.competitions ?? []).map(c => ({ key: String(c.id), label: c.name })),
)

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
      <SegmentLinks
        v-if="segments.length > 1"
        :items="segments"
        :current="String(data.chosen ?? '')"
        param="competition"
        class="mb-5"
      />

      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="min-w-0 truncate text-lg font-bold">
          {{ chosenCompetition?.name ?? 'Календарь' }}
        </h2>
        <RefreshButton
          :pending="status === 'pending'"
          @refresh="refresh()"
        />
      </div>

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
          empty-hint="Результаты появятся, когда организаторы внесут счёт."
        />
      </div>
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
