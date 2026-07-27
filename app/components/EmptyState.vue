<script setup lang="ts">
/**
 * Пустое состояние. Здесь это не исключение, а один из основных видов:
 * лига наполняется волонтёрами через админку, и «протокол не внесён» или
 * «команды ещё не заявлены» — нормальное состояние на месяцы.
 *
 * Поэтому: обычный видимый текст и токены темы. Никакой прозрачности ниже
 * 10%, никаких текстур в 4% и никакого третьего вебшрифта — если состояние
 * несёт смысл, оно должно быть читаемым на дешёвом экране при 20% яркости.
 */
withDefaults(
  defineProps<{
    title: string
    /** Почему пусто и что будет дальше — без извинений и без «упс» */
    hint?: string
    icon?: string
    /** compact — внутри секции; page — на всю страницу */
    variant?: 'compact' | 'page'
  }>(),
  { icon: 'info', variant: 'compact' },
)
</script>

<template>
  <div
    class="rounded-xl border border-rule bg-surface text-center"
    :class="variant === 'page' ? 'px-6 py-14' : 'px-4 py-8'"
  >
    <AppIcon
      :name="icon"
      :size="variant === 'page' ? 32 : 24"
      class="mx-auto text-muted"
    />
    <p
      class="mt-3 font-semibold"
      :class="variant === 'page' ? 'text-lg' : 'text-[15px]'"
    >
      {{ title }}
    </p>
    <p
      v-if="hint"
      class="mx-auto mt-1.5 max-w-md text-sm text-muted"
    >
      {{ hint }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-5"
    >
      <slot />
    </div>
  </div>
</template>
