<template>
  <!--
    Отступ снизу под плавающую панель: 56px сама пилюля, 12px просвет под
    ней, плюс вырез на iPhone. Без этого последняя карточка списка уезжает
    под панель, а полоса вокруг неё гасит касания — до карточки было бы не
    дотянуться.
  -->
  <div class="flex min-h-dvh flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <AppFooter />
    <AppBottomNav />
  </div>
</template>
