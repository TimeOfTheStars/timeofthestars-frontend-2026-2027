<script setup lang="ts">
/**
 * Нижняя панель — главный способ навигации на телефоне: один тап до любого
 * счёта из любого места. Четыре пункта, подписи 11px (не 10 — на вытянутой
 * руке в полутёмном зале это уже неразборчиво), тач-таргеты 56px.
 *
 * Никакого backdrop-filter: на среднем Android это измеримая просадка скролла
 * на списке из 200 матчей, а пользы ноль.
 */
const route = useRoute()
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
    aria-label="Основная навигация"
  >
    <ul class="grid grid-cols-4">
      <li
        v-for="item in PRIMARY_NAV"
        :key="item.to"
      >
        <NuxtLink
          :to="item.to"
          class="flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 transition-colors"
          :class="isNavActive(item, route.path) ? 'text-accent' : 'text-muted'"
          :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
        >
          <AppIcon
            :name="item.icon"
            :size="22"
            :weight="isNavActive(item, route.path) ? 2.25 : 1.75"
          />
          <span class="text-[11px] leading-none font-semibold">{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
