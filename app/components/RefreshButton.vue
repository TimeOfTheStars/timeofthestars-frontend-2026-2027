<script setup lang="ts">
/**
 * Кнопка «Обновить».
 *
 * API не отдаёт created_at / updated_at (подводный камень №18), поэтому
 * показать «обновлено N минут назад» нечем — пользователь не может понять,
 * свежий ли перед ним счёт. Явная кнопка — единственный честный ответ.
 */
withDefaults(
  defineProps<{ pending?: boolean; label?: string }>(),
  { label: 'Обновить' },
)

const emit = defineEmits<{ refresh: [] }>()
</script>

<template>
  <button
    type="button"
    class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold text-muted transition-colors hover:text-fg disabled:opacity-60"
    :disabled="pending"
    @click="emit('refresh')"
  >
    <AppIcon
      name="refresh"
      :size="16"
      :class="pending && 'animate-spin'"
    />
    {{ pending ? 'Обновляем…' : label }}
  </button>
</template>
