<script setup lang="ts">
/**
 * Состояние «запрос упал, и показать нечего».
 *
 * Отличается от StaleNotice: там данные есть и мы их оставляем на экране,
 * здесь их нет вообще. Без этого блока страница рендерилась бы пустой —
 * проверено на остановленном API: отдавался HTTP 200 с пустым телом.
 */
defineProps<{ pending?: boolean }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="rounded-xl border border-rule bg-surface px-6 py-12 text-center">
    <AppIcon
      name="alert"
      :size="32"
      class="mx-auto text-muted"
    />
    <p class="mt-3 text-lg font-semibold">
      Не удалось загрузить данные
    </p>
    <p class="mx-auto mt-1.5 max-w-sm text-sm text-muted">
      Сервер лиги не отвечает. Обычно это ненадолго — попробуйте ещё раз.
      Если вы на катке, проверьте связь.
    </p>
    <div class="mt-6 flex justify-center">
      <button
        type="button"
        class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-fg disabled:opacity-60"
        :disabled="pending"
        @click="emit('retry')"
      >
        <AppIcon
          name="refresh"
          :size="18"
          :class="pending && 'animate-spin'"
        />
        {{ pending ? 'Обновляем…' : 'Повторить' }}
      </button>
    </div>
  </div>
</template>
