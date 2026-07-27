<script setup lang="ts">
import type { Competition, CompetitionType, Page } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Список соревнований.
 * Поиска по названию в API нет (подводный камень №19) — только фильтр по типу
 * и пагинация. Сортировка серверная: start_date ↓, затем id ↓ — сначала свежие.
 */
const route = useRoute()

const TYPES = ['championship', 'tournament'] as const
const SIZE = 24

const type = computed<CompetitionType | undefined>(() => {
  const t = route.query.type
  return TYPES.includes(t as CompetitionType) ? (t as CompetitionType) : undefined
})
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

// Справочник команд нужен карточке: у соревнования бывает winner_team_id,
// а названия команды в объекте соревнования нет.
const { data, status, error, refresh } = await usePageData(
  () => `competitions:${type.value ?? 'all'}:${page.value}`,
  $api =>
    $api<Page<Competition>>(ep.competitions, {
      query: { page: page.value, size: SIZE, ...(type.value ? { type: type.value } : {}) },
    }),
  { watch: [type, page] },
)

const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.size) : 0))

const segments = computed(() => [
  { key: '', label: 'Все' },
  { key: 'championship', label: 'Чемпионаты' },
  { key: 'tournament', label: 'Турниры' },
])

useHead({ title: 'Соревнования' })
useSeoMeta({
  description:
    'Чемпионаты и турниры любительской хоккейной лиги «Время звёзд»: таблицы, календарь, составы и статистика.',
})
</script>

<template>
  <div class="container-page py-5">
    <h1 class="mb-4 text-2xl font-extrabold">
      Соревнования
    </h1>

    <SegmentLinks
      :items="segments"
      :current="type ?? ''"
      param="type"
      class="mb-5"
    />

    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="4"
      :height="84"
      rounded="rounded-xl"
    />

    <template v-else-if="data?.items.length">
      <ul class="space-y-2">
        <li
          v-for="c in data.items"
          :key="c.id"
        >
          <CompetitionCard :competition="c" />
        </li>
      </ul>

      <PagerNav
        v-if="pages > 1"
        :page="page"
        :pages="pages"
      />
    </template>

    <LoadError
      v-else-if="error"
      :pending="status === 'pending'"
      @retry="refresh()"
    />

    <EmptyState
      v-else
      icon="trophy"
      variant="page"
      :title="type ? 'Соревнований этого типа нет' : 'Соревнований пока нет'"
      :hint="type ? 'Попробуйте снять фильтр.' : 'Как только организаторы создадут чемпионат или турнир, он появится здесь.'"
    />
  </div>
</template>
