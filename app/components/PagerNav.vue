<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router'

/**
 * Пагинация ссылками: работает без JS, шарится, индексируется.
 *
 * Раньше здесь были только «Назад» и «Вперёд». На 554 игроках это 12
 * страниц, и до седьмой приходилось жать шесть раз. Теперь номера с
 * многоточиями: первая, последняя, текущая и соседние.
 *
 * Окно узкое намеренно. Полный список из 12 номеров не влезает на 375px, а
 * прокручиваемая полоса номеров — это уже отдельный элемент управления,
 * который сам просит объяснения.
 */
const props = defineProps<{ page: number, pages: number }>()

const route = useRoute()

function pageLink(n: number) {
  const query: LocationQueryRaw = { ...route.query, page: n }
  // Первая страница — это адрес без параметра: иначе в ссылке копится
  // ?page=1, который нечего шарить.
  if (n === 1) delete query.page
  return { path: route.path, query }
}

/** Номера и разрывы: 1 … 5 6 7 … 12 */
const items = computed<(number | 'gap')[]>(() => {
  const { page, pages } = props
  const window = new Set<number>([1, pages, page - 1, page, page + 1])
  const shown = [...window].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  let prev = 0
  for (const n of shown) {
    // Разрыв ставим, только если пропущено БОЛЬШЕ одной страницы: «1 … 3»
    // занимает столько же места, сколько «1 2 3», но читается хуже.
    if (prev && n - prev > 1) out.push('gap')
    out.push(n)
    prev = n
  }
  return out
})
</script>

<template>
  <nav
    class="mt-6 flex items-center justify-between gap-2"
    aria-label="Страницы"
  >
    <NuxtLink
      v-if="page > 1"
      :to="pageLink(page - 1)"
      rel="prev"
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-rule"
      aria-label="Предыдущая страница"
    >
      <AppIcon
        name="arrowLeft"
        :size="16"
      />
    </NuxtLink>
    <span
      v-else
      class="size-11 shrink-0"
    />

    <ul class="flex min-w-0 items-center justify-center gap-1">
      <li
        v-for="(item, i) in items"
        :key="`${item}-${i}`"
        class="shrink-0"
      >
        <span
          v-if="item === 'gap'"
          class="px-1 text-sm text-muted"
          aria-hidden="true"
        >…</span>
        <NuxtLink
          v-else
          :to="pageLink(item)"
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums transition-colors"
          :class="item === page
            ? 'bg-accent text-accent-fg'
            : 'border border-rule text-muted hover:text-fg'"
          :aria-current="item === page ? 'page' : undefined"
        >{{ item }}</NuxtLink>
      </li>
    </ul>

    <NuxtLink
      v-if="page < pages"
      :to="pageLink(page + 1)"
      rel="next"
      class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-rule"
      aria-label="Следующая страница"
    >
      <AppIcon
        name="chevronRight"
        :size="16"
      />
    </NuxtLink>
    <span
      v-else
      class="size-11 shrink-0"
    />
  </nav>
</template>
