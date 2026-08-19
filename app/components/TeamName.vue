<script setup lang="ts">
import type { Team } from '#shared/types/api'
// Именно объект компонента, а не строка 'NuxtLink': автоимпорт Nuxt
// работает по статическим тегам в шаблоне и динамическое имя не видит —
// строка отрендерилась бы литеральным тегом <NuxtLink>, а не ссылкой.
import { NuxtLink } from '#components'

/**
 * Герб + название команды. Основной способ показать команду где угодно.
 *
 * Принимает либо готовый объект (в standings он вложен целиком), либо id —
 * тогда название берётся из справочника. Если команды в справочнике нет,
 * покажет «Команда №N»: честно, без выдуманного имени.
 */
const props = withDefaults(
  defineProps<{
    team?: Team | null
    teamId?: number | null
    size?: number
    showCity?: boolean
    link?: boolean
    /** выделить как победителя */
    strong?: boolean
  }>(),
  { size: 28, showCity: false, link: true, strong: false },
)

const { team: lookup, teamName } = useTeamDirectory()

const resolved = computed<Team | null>(() => props.team ?? lookup(props.teamId))
const label = computed(() => props.team?.name ?? teamName(props.teamId))
const href = computed(() => (resolved.value ? teamPath(resolved.value) : null))
</script>

<template>
  <component
    :is="link && href ? NuxtLink : 'span'"
    :to="link && href ? href : undefined"
    class="flex min-w-0 items-center gap-2"
  >
    <TeamCrest
      :team="resolved"
      :team-id="teamId"
      :size="size"
    />
    <span class="min-w-0">
      <span
        class="block truncate"
        :class="strong ? 'font-bold' : 'font-semibold'"
      >{{ label }}</span>
      <span
        v-if="showCity && resolved?.city"
        class="block truncate text-xs text-muted"
      >{{ resolved.city }}</span>
    </span>
  </component>
</template>
