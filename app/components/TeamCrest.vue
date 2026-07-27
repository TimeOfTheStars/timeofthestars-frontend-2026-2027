<script setup lang="ts">
import type { Team } from '#shared/types/api'

/**
 * Герб команды. Логотип, если он есть; иначе монограмма на цветном щите
 * (цвет детерминирован из team.id — см. utils/crest.ts).
 *
 * Вид «нет логотипа» здесь основной, а не аварийный: в живой базе логотип
 * есть у одной команды из четырёх.
 */
const props = withDefaults(
  defineProps<{
    team?: Team | null
    /** когда объекта команды нет, а id известен (например из матча) */
    teamId?: number | null
    size?: number
  }>(),
  { size: 28 },
)

/**
 * Если передан только teamId, объект команды достаём из справочника сами.
 * Без этого монограмма считалась от undefined и выводился прочерк — так и было
 * в блоке «По командам» на странице игрока, где известен лишь id.
 */
const { team: lookup } = useTeamDirectory()
const resolved = computed(() => props.team ?? lookup(props.teamId))

const id = computed(() => resolved.value?.id ?? props.teamId ?? 0)
const initials = computed(() => crestInitials(resolved.value?.name))
const color = computed(() => crestColor(id.value))

/**
 * Подставляем монограмму не только когда logo_url пуст, но и когда картинка
 * НЕ ЗАГРУЗИЛАСЬ. Это не теоретический случай: в живой базе ссылки на медиа
 * есть, а самих файлов на диске нет — отдаётся 404. Без этого пользователь
 * видел бы штатную «битую картинку» браузера.
 */
const failed = ref(false)
const logo = computed(() => (failed.value ? null : mediaUrl(resolved.value?.logo_url)))
watch(() => resolved.value?.logo_url, () => (failed.value = false))

/** Кегль монограммы от размера бокса; на 24px это 10px, на 96px — 38px */
const fontSize = computed(() => Math.max(9, Math.round(props.size * 0.4)))
</script>

<template>
  <!--
    Логотип ВСЕГДА на белом фоне: загруженные PNG/WebP часто прозрачные
    с тёмной графикой — на steel-950 они бы просто исчезли.
  -->
  <img
    v-if="logo"
    :src="logo"
    :alt="resolved?.name ?? ''"
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    class="shrink-0 rounded-[22%] bg-white object-contain ring-1 ring-rule"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = true"
  >

  <span
    v-else
    class="grid shrink-0 place-items-center rounded-[22%] font-bold text-white select-none"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      fontSize: `${fontSize}px`,
      lineHeight: 1,
    }"
    aria-hidden="true"
  >{{ initials }}</span>
</template>
