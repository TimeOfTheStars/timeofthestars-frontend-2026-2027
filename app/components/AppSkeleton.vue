<script setup lang="ts">
/**
 * Скелет загрузки. Геометрия должна совпадать с финальной, иначе на медленном
 * соединении контент прыгает — а именно медленное соединение здесь норма.
 * Анимация уважает prefers-reduced-motion (правило в main.css).
 */
withDefaults(
  defineProps<{
    /** количество строк */
    rows?: number
    /** высота строки в px */
    height?: number
    rounded?: string
  }>(),
  { rows: 1, height: 16, rounded: 'rounded-md' },
)
</script>

<template>
  <div
    class="flex flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <span class="sr-only">Загрузка данных</span>
    <span
      v-for="i in rows"
      :key="i"
      class="block animate-pulse bg-surface-2"
      :class="rounded"
      :style="{
        height: `${height}px`,
        // последняя строка короче — так скелет читается как текст, а не как блок
        width: rows > 1 && i === rows ? '60%' : '100%',
      }"
    />
  </div>
</template>
