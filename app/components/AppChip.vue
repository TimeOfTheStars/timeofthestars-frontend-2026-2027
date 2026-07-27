<script setup lang="ts">
/**
 * Чип — статус матча, стадия, буллиты, признак контракта.
 *
 * Правило проекта: цветная заливка ВСЕГДА идёт со своим парным цветом текста,
 * и это обеспечивает компонент, а не комментарий в документации. Пары заданы
 * токенами и меняются вместе с темой: в светлой это белый на red-600,
 * в тёмной — тёмный на red-400. Поэтому «красная плашка с тёмным текстом
 * на 2.7:1» здесь невозможна по построению.
 */
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'accent' | 'flag' | 'outline'
    size?: 'sm' | 'md'
    icon?: string
  }>(),
  { variant: 'neutral', size: 'md' },
)

const VARIANT = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent text-accent-fg',
  flag: 'bg-flag text-flag-fg',
  outline: 'border border-rule-strong text-muted',
} as const

const SIZE = {
  // 11px — только для служебных отметок (номер, «К»); 12px — общий пол
  sm: 'text-[11px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
} as const
</script>

<template>
  <span
    class="inline-flex items-center rounded-md font-semibold whitespace-nowrap"
    :class="[VARIANT[variant], SIZE[size]]"
  >
    <AppIcon
      v-if="icon"
      :name="icon"
      :size="size === 'sm' ? 12 : 14"
    />
    <slot />
  </span>
</template>
