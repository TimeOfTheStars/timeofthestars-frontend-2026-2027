<script setup lang="ts">
/**
 * Разделы страницы — ССЫЛКАМИ (?tab=…), а не компонентом-табами.
 *
 * Так они шарятся в мессенджер, индексируются, работают без JS и при
 * переходе «назад» ведут туда, откуда ушли. Компонентные табы всего этого
 * не дают, а взамен не дают ничего.
 */
import type { LocationQueryRaw } from 'vue-router'

export interface Segment {
  key: string
  label: string
  count?: number | null
}

const props = defineProps<{
  items: Segment[]
  current: string
  /** имя query-параметра */
  param?: string
}>()

const route = useRoute()
const param = computed(() => props.param ?? 'tab')

function linkTo(key: string) {
  const query: LocationQueryRaw = { ...route.query }
  // Пустой ключ — это «без фильтра»: параметр убираем, а не пишем пустым,
  // иначе в URL остаётся мусор вида ?type=
  if (key) query[param.value] = key
  else delete query[param.value]
  // При смене раздела/фильтра всегда возвращаемся на первую страницу
  delete query.page
  return { path: route.path, query }
}
</script>

<template>
  <div
    class="table-bleed overflow-x-auto border-b border-rule sm:overflow-visible"
    role="navigation"
    aria-label="Разделы"
  >
    <ul class="flex min-w-max gap-1 px-4 sm:min-w-0 sm:px-0">
      <li
        v-for="item in items"
        :key="item.key"
      >
        <NuxtLink
          :to="linkTo(item.key)"
          replace
          class="flex min-h-12 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors"
          :class="
            item.key === current
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-fg'
          "
          :aria-current="item.key === current ? 'true' : undefined"
        >
          {{ item.label }}
          <span
            v-if="item.count != null"
            class="text-xs font-medium text-muted"
          >{{ item.count }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
