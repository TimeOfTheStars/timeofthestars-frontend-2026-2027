<script setup lang="ts">
import type { Player } from '#shared/types/api'

/**
 * Аватар игрока. Круг — в отличие от квадратного герба команды, чтобы
 * «человек» и «клуб» не путались в списках.
 *
 * photo_url в живой базе почти всегда null, поэтому монограмма — основной вид.
 */
const props = withDefaults(
  defineProps<{ player?: Player | null; size?: number }>(),
  { size: 40 },
)

const initials = computed(() => playerInitials(props.player?.full_name))
const fontSize = computed(() => Math.max(9, Math.round(props.size * 0.36)))

/** Как и у герба: фолбэк и на пустой photo_url, и на не загрузившийся файл */
const failed = ref(false)
const photo = computed(() => (failed.value ? null : mediaUrl(props.player?.photo_url)))
watch(() => props.player?.photo_url, () => (failed.value = false))
</script>

<template>
  <img
    v-if="photo"
    :src="photo"
    :alt="player?.full_name ?? ''"
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    class="shrink-0 rounded-full bg-surface-2 object-cover ring-1 ring-rule"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = true"
  >

  <span
    v-else
    class="grid shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-muted ring-1 ring-rule select-none"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${fontSize}px`,
      lineHeight: 1,
    }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>
