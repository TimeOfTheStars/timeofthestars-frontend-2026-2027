<script setup lang="ts">
/**
 * Показывается, когда запрос упал, НО данные в стейте уже есть.
 *
 * Это реальный сценарий на wi-fi катка: соединение ассоциируется, но не
 * резолвит. Правильное поведение — оставить последние данные на экране и
 * честно предупредить, а не выбрасывать пользователя на пустой экран.
 */
defineProps<{ pending?: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <div
    class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rule-strong bg-surface-2 px-4 py-3"
    role="status"
  >
    <AppIcon
      name="alert"
      :size="18"
      class="text-muted"
    />
    <p class="min-w-0 flex-1 text-sm">
      <span class="font-semibold">Данные могут быть неактуальны.</span>
      <span class="text-muted"> Не удалось связаться с сервером лиги.</span>
    </p>
    <RefreshButton
      :pending="pending"
      label="Повторить"
      @refresh="emit('refresh')"
    />
  </div>
</template>
