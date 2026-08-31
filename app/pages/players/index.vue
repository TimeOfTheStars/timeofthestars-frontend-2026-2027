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

// Вид и его запоминание — в общем композабле: то же самое нужно командам
const { view, link: viewLink } = useListView('players')

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
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-xs text-muted">
          {{ pluralWith(data.total, ['игрок', 'игрока', 'игроков']) }}
        </p>

        <!-- Вид списка. Ссылками, а не кнопками: выбор попадает в адрес и
             сохраняется при переходе по страницам. -->
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
        <!-- Плитка: крупное фото, имя, амплуа -->
        <ul
          v-if="view === 'cards'"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <li
            v-for="p in data.items"
            :key="p.id"
          >
            <NuxtLink
              :to="playerPath(p)"
              class="reveal flex h-full flex-col items-center gap-2 rounded-xl border border-rule bg-surface p-4 text-center transition-colors hover:border-rule-strong"
            >
              <PlayerAvatar
                :player="p"
                :size="96"
              />
              <span class="mt-1 line-clamp-2 font-semibold">{{ p.full_name }}</span>
              <span
                v-if="p.position"
                class="text-xs text-muted"
              >{{ p.position }}</span>
              <span
                v-if="age(p.birth_date) != null"
                class="mt-auto text-xs text-muted"
              >{{ pluralWith(age(p.birth_date)!, ['год', 'года', 'лет']) }}</span>
            </NuxtLink>
          </li>
        </ul>

        <ul
          v-else
          class="space-y-2"
        >
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
      icon="users"
      variant="page"
      :title="q ? 'Ничего не найдено' : 'Игроков пока нет'"
      :hint="q ? `По запросу «${q}» игроков не нашлось.` : 'Игроки появятся, когда организаторы добавят их в справочник.'"
    />
  </div>
</template>
