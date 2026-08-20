<script setup lang="ts">
/**
 * Логотип соревнования с двойным фолбэком: пустой logo_url И не загрузившийся
 * файл дают марку лиги. Файлы на диске пропадают — в живой базе ссылки есть,
 * а самих файлов нет.
 */
const props = withDefaults(
  defineProps<{ src?: string | null; size?: number }>(),
  { size: 48 },
)

const failed = ref(false)
const url = computed(() => (failed.value ? null : mediaUrl(props.src)))
watch(() => props.src, () => (failed.value = false))
</script>

<template>
  <img
    :src="url ?? '/brand/logo-vremya-zvezd-wide.webp'"
    alt=""
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    class="shrink-0 rounded-lg object-contain"
    :class="url && 'bg-white ring-1 ring-rule'"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = true"
  >
</template>
