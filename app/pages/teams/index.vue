<script setup lang="ts">
import type { Page, Team } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/** search — регистронезависимая подстрока по названию И городу. */
const route = useRoute()
const SIZE = 50

const q = computed(() => String(route.query.q ?? '').trim())
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data, status, error, refresh } = await usePageData(
  () => `teams:${q.value}:${page.value}`,
  $api =>
    $api<Page<Team>>(ep.teams, {
      query: { page: page.value, size: SIZE, ...(q.value ? { search: q.value } : {}) },
    }),
  { watch: [q, page] },
)

const { myTeamId } = useMyTeam()
const { view, link: viewLink } = useListView('teams')
const pages = computed(() => (data.value ? Math.ceil(data.value.total / data.value.size) : 0))

useHead({ title: 'Команды' })
useSeoMeta({
  description: 'Команды любительской хоккейной лиги «Время звёзд»: составы, матчи и статистика.',
})
</script>

<template>
  <div class="container-page py-5">
    <h1 class="mb-4 text-2xl font-extrabold">
      Команды
    </h1>

    <SearchInput
      label="Поиск по названию или городу"
      placeholder="Название или город"
      class="mb-5"
    />

    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="6"
      :height="64"
      rounded="rounded-xl"
    />

    <template v-else-if="data?.items.length">
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-xs text-muted">
          {{ pluralWith(data.total, ['команда', 'команды', 'команд']) }}
        </p>

        <!-- Вид списка. Ссылками, а не кнопками: выбор попадает в адрес и
             сохраняется при переходе по страницам, а useListView вдобавок
             запоминает его в localStorage. -->
        <div
          class="flex gap-1 rounded-lg border border-rule p-1"
          role="group"
          aria-label="Вид списка"
        >
          <NuxtLink
            v-for="opt in [
              { key: 'list', icon: 'list', label: 'Списком' },
              { key: 'cards', icon: 'grid', label: 'Плиткой' },
            ]"
            :key="opt.key"
            :to="viewLink(opt.key as 'list' | 'cards')"
            replace
            class="flex size-9 items-center justify-center rounded-md transition-colors"
            :class="view === opt.key ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'"
            :aria-label="opt.label"
            :aria-current="view === opt.key ? 'true' : undefined"
          >
            <AppIcon
              :name="opt.icon"
              :size="17"
            />
          </NuxtLink>
        </div>
      </div>

      <!-- Смена вида: анимируем контейнер, а не карточки. У карточек
           висит .reveal, а CSS-анимация перебивает transition. -->
      <Transition
        name="swap"
        mode="out-in"
      >
        <!-- Плитка: крупный герб, название, город -->
        <ul
          v-if="view === 'cards'"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <li
            v-for="t in data.items"
            :key="t.id"
          >
            <NuxtLink
              :to="teamPath(t)"
              class="reveal flex h-full flex-col items-center gap-2 rounded-xl border bg-surface p-4 text-center transition-colors"
              :class="t.id === myTeamId ? 'border-accent' : 'border-rule hover:border-rule-strong'"
            >
              <TeamCrest
                :team="t"
                :size="72"
              />
              <span class="mt-1 line-clamp-2 font-semibold">{{ t.name }}</span>
              <span
                v-if="t.city"
                class="text-xs text-muted"
              >{{ t.city }}</span>
              <AppChip
                v-if="t.id === myTeamId"
                size="sm"
                variant="accent"
                class="mt-auto"
              >
                Моя
              </AppChip>
            </NuxtLink>
          </li>
        </ul>

        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="t in data.items"
            :key="t.id"
          >
            <NuxtLink
              :to="teamPath(t)"
              class="reveal flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors"
              :class="t.id === myTeamId ? 'border-accent' : 'border-rule hover:border-rule-strong'"
            >
              <TeamCrest
                :team="t"
                :size="40"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold">{{ t.name }}</span>
                <span
                  v-if="t.city"
                  class="block truncate text-xs text-muted"
                >{{ t.city }}</span>
              </span>
              <AppChip
                v-if="t.id === myTeamId"
                size="sm"
                variant="accent"
              >
                Моя
              </AppChip>
              <AppIcon
                name="chevronRight"
                :size="18"
                class="shrink-0 text-muted"
              />
            </NuxtLink>
          </li>
        </ul>
      </Transition>

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
      icon="shield"
      variant="page"
      :title="q ? 'Ничего не найдено' : 'Команд пока нет'"
      :hint="q ? `По запросу «${q}» команд не нашлось. Попробуйте другое название или город.` : 'Команды появятся, когда организаторы добавят их в справочник.'"
    />
  </div>
</template>
