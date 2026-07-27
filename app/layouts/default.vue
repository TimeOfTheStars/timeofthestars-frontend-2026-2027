<template>
  <!-- Отступ снизу под фиксированную нижнюю панель + вырез на iPhone -->
  <div class="flex min-h-dvh flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <AppFooter />
    <AppBottomNav />
  </div>
</template>
