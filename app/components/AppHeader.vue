<script setup lang="ts">
const route = useRoute()
const { theme, toggle } = useColorTheme()
</script>

<template>
  <header
    class="sticky top-0 z-30 h-header border-b border-rule bg-bg"
  >
    <div class="container-page flex h-full items-center gap-3">
      <NuxtLink
        to="/"
        class="flex min-h-11 min-w-0 items-center gap-2.5"
        aria-label="Время звёзд — на главную"
      >
        <img
          src="/brand/logo-vremya-zvezd-512.png"
          alt=""
          width="36"
          height="36"
          class="size-9 shrink-0"
        >
        <span class="min-w-0 leading-none">
          <span class="block truncate text-[15px] font-extrabold tracking-tight">
            ВРЕМЯ ЗВЁЗД
          </span>
          <span class="mt-0.5 hidden truncate text-xs text-muted sm:block">
            Любительская хоккейная лига
          </span>
        </span>
      </NuxtLink>

      <!-- Десктопная навигация. На телефоне её роль играет нижняя панель. -->
      <nav
        class="ml-6 hidden lg:block"
        aria-label="Основная навигация"
      >
        <ul class="flex items-center gap-1">
          <li
            v-for="item in DESKTOP_NAV"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              class="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-surface-2"
              :class="isNavActive(item, route.path) ? 'text-accent' : 'text-muted'"
              :aria-current="isNavActive(item, route.path) ? 'page' : undefined"
            >
              <AppIcon
                :name="item.icon"
                :size="18"
              />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <button
        type="button"
        class="ml-auto grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        :aria-label="theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
        @click="toggle"
      >
        <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
      </button>
    </div>
  </header>
</template>
