<script setup lang="ts">
import type { Game } from '#shared/types/api'

/**
 * Карусель матчей для главной — как на прошлом сайте: все матчи в одной
 * ленте, 1 карточка на телефоне и 2–3 на широких экранах, стрелки только
 * с sm, без автопрокрутки и без бесконечной петли.
 *
 * Реализована нативным CSS scroll-snap, а не Swiper:
 *  • родная инерция прокрутки на iOS/Android — лучше любой JS-эмуляции;
 *  • работает без JS (стрелки просто не появляются);
 *  • ноль зависимостей вместо ~150 КБ.
 *
 * Главная идея с прошлого сайта: лента ОТКРЫВАЕТСЯ НА «СЕЙЧАС» — на последнем
 * сыгранном матче, чтобы рядом были и свежий результат, и следующая игра.
 *
 * Что улучшено: на телефоне видно край следующей карточки. У прошлого сайта
 * было ровно 1.0 карточки на экран, и что лента листается, приходилось угадывать.
 */
const props = defineProps<{
  games: Game[]
  /** id матча, на котором открыть ленту. По умолчанию — «сейчас». */
  focusGameId?: number | null
  /** Заголовок ленты; вместе со стрелками образует одну строку */
  title?: string
  /** Ссылка «Всё» справа от заголовка */
  moreTo?: string
}>()

const track = ref<HTMLElement | null>(null)
const items = ref<HTMLElement[]>([])
const atStart = ref(true)
const atEnd = ref(false)

/**
 * Порядок серверный (дата → время → id) — своей сортировки не добавляем,
 * иначе разойдёмся с остальными экранами.
 */
const list = computed(() => props.games)

/**
 * Индекс «сейчас»: последний сыгранный матч перед первым запланированным.
 * Если всё впереди — первый; если всё позади — последний.
 */
const focusIndex = computed(() => {
  if (!list.value.length) return 0

  if (props.focusGameId != null) {
    const i = list.value.findIndex(g => g.id === props.focusGameId)
    if (i >= 0) return i
  }

  const firstUpcoming = list.value.findIndex(g => g.status === 'scheduled')
  if (firstUpcoming > 0) return firstUpcoming - 1
  if (firstUpcoming === 0) return 0
  return list.value.length - 1
})

function updateEdges() {
  const el = track.value
  if (!el) return
  atStart.value = el.scrollLeft <= 1
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
}

function scrollToIndex(i: number, behavior: ScrollBehavior = 'smooth') {
  const el = track.value
  const item = items.value[i]
  if (!el || !item) return
  el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior })
}

/** Листаем на ширину видимой области — сколько карточек влезло, столько и сдвиг */
function page(dir: -1 | 1) {
  const el = track.value
  if (!el) return
  el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' })
}

onMounted(() => {
  // instant, а не smooth: при загрузке лента должна СРАЗУ стоять на «сейчас»,
  // а не проматываться у пользователя на глазах
  scrollToIndex(focusIndex.value, 'instant')
  updateEdges()
})

watch(list, () => nextTick(() => {
  scrollToIndex(focusIndex.value, 'instant')
  updateEdges()
}))
</script>

<template>
  <div v-if="list.length">
    <!--
      Заголовок и стрелки — одной строкой НАД лентой, а не поверх карточек.
      Наложенные стрелки перекрывали герб и название первой команды: 44px
      кнопка неизбежно залезает на карточку, которая начинается от края
      контейнера.
    -->
    <div class="mb-3 flex items-center gap-3">
      <h3
        v-if="title"
        class="min-w-0 flex-1 truncate text-lg font-bold"
      >
        {{ title }}
      </h3>
      <span
        v-else
        class="flex-1"
      />

      <NuxtLink
        v-if="moreTo"
        :to="moreTo"
        class="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent"
      >
        Всё
        <AppIcon
          name="chevronRight"
          :size="15"
        />
      </NuxtLink>

      <!-- Стрелки только с sm: на телефоне свайп естественнее и точнее -->
      <div class="hidden shrink-0 items-center gap-1.5 sm:flex">
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full border border-rule text-fg transition-opacity disabled:opacity-40"
          aria-label="Предыдущие матчи"
          :disabled="atStart"
          @click="page(-1)"
        >
          <AppIcon
            name="arrowLeft"
            :size="18"
          />
        </button>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full border border-rule text-fg transition-opacity disabled:opacity-40"
          aria-label="Следующие матчи"
          :disabled="atEnd"
          @click="page(1)"
        >
          <AppIcon
            name="chevronRight"
            :size="18"
          />
        </button>
      </div>
    </div>

    <!--
      role=group + tabindex=0: прокручиваемая область должна быть достижима
      с клавиатуры, иначе до части матчей не добраться без мыши.
    -->
    <div
      ref="track"
      role="group"
      tabindex="0"
      aria-label="Матчи, лента с прокруткой"
      class="no-scrollbar table-bleed relative flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:mx-0 sm:w-full sm:scroll-pl-0 sm:px-0"
      @scroll.passive="updateEdges"
    >
      <!--
        scroll-pl-4 обязателен: padding-left прокручивается вместе с контентом,
        поэтому без scroll-padding прилипшая карточка упиралась бы в самый край
        экрана без отступа.

        flex + h-full — чтобы карточки были одной высоты: иначе карточка со
        чипом «Запланирован» выше соседней, и лента прыгает при листании.
      -->
      <div
        v-for="(game, i) in list"
        :key="game.id"
        :ref="el => { if (el) items[i] = el as HTMLElement }"
        class="flex w-[86%] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)]"
      >
        <GameCard
          :game="game"
          show-stage
          class="h-full w-full"
        />
      </div>
    </div>

  </div>

  <EmptyState
    v-else
    icon="calendar"
    title="Матчей пока нет"
    hint="Появятся, когда организаторы внесут игры соревнования."
  />
</template>
