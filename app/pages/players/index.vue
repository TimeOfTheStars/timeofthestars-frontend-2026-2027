<script setup lang="ts">
import type { Page, Player } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/** search — подстрока по ФИО. Сортировка серверная, по ФИО. */
const route = useRoute()
const SIZE = 50

const q = computed(() => String(route.query.q ?? '').trim())
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data, status, error, refresh } = await usePageData(
  () => `players:${q.value}:${page.value}`,
  $api =>
    $api<Page<Player>>(ep.players, {
      query: { page: page.value, size: SIZE, ...(q.value ? { search: q.value } : {}) },
    }),
  { watch: [q, page] },
)

const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.size) : 0))

useHead({ title: 'Игроки' })
useSeoMeta({
  // «по сезонам» здесь было неверно: разбивка в API идёт по соревнованиям
  // и командам (by_competition / by_team), сезонов в данных нет
  description: 'Игроки любительской хоккейной лиги «Время звёзд»: статистика по соревнованиям и командам.',
})
</script>

<template>
  <div class="container-page py-5">
    <h1 class="mb-4 text-2xl font-extrabold">
      Игроки
    </h1>

    <SearchInput
      label="Поиск по фамилии или имени"
      placeholder="Фамилия или имя"
      class="mb-5"
    />

    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="8"
      :height="60"
      rounded="rounded-xl"
    />

    <template v-else-if="data?.items.length">
      <p class="mb-2 text-xs text-muted">
        {{ pluralWith(data.total, ['игрок', 'игрока', 'игроков']) }}
      </p>

      <ul class="space-y-2">
        <li
          v-for="p in data.items"
          :key="p.id"
        >
          <NuxtLink
            :to="playerPath(p)"
            class="reveal flex items-center gap-3 rounded-xl border border-rule bg-surface p-3 transition-colors hover:border-rule-strong"
          >
            <PlayerAvatar
              :player="p"
              :size="40"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold">{{ p.full_name }}</span>
              <span
                v-if="p.position || age(p.birth_date) != null"
                class="block truncate text-xs text-muted"
              >
                <template v-if="p.position">{{ p.position }}</template>
                <template v-if="p.position && age(p.birth_date) != null"> · </template>
                <template v-if="age(p.birth_date) != null">
                  {{ pluralWith(age(p.birth_date)!, ['год', 'года', 'лет']) }}
                </template>
              </span>
            </span>
            <AppIcon
              name="chevronRight"
              :size="18"
              class="shrink-0 text-muted"
            />
          </NuxtLink>
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
      icon="users"
      variant="page"
      :title="q ? 'Ничего не найдено' : 'Игроков пока нет'"
      :hint="q ? `По запросу «${q}» игроков не нашлось.` : 'Игроки появятся, когда организаторы добавят их в справочник.'"
    />
  </div>
</template>
