<script setup lang="ts">
/**
 * Нижняя панель — главный способ навигации на телефоне: один тап до любого
 * счёта из любого места. Пять пунктов, подписи 11px, тач-таргеты 56px.
 *
 * Ниже 360px подписи убираются и остаются одни иконки: там под самую широкую
 * подпись остаётся 6px запаса против 14px на 360px (промер по шрифту — см.
 * nav.ts). Скрываются они ВИЗУАЛЬНО, но не для скринридера: текст ссылки и
 * есть её доступное имя, иначе в панели окажутся пять безымянных кнопок.
 *
 * Стекло — только на устройствах Apple. Прежний запрет звучал так: «никакого
 * backdrop-filter: на среднем Android это измеримая просадка скролла на
 * списке из 200 матчей». Запрет остаётся в силе именно для Android, а панель
 * тут худший случай: фиксированный слой поверх длинного списка пересчитывает
 * размытие каждый кадр.
 *
 * User-Agent — это ДОГАДКА о производительности, а не она сама: флагманский
 * Android потянет размытие лучше старого iPhone. Но исходный замер говорил
 * именно про средний Android, поэтому разделение по вендору бьёт примерно
 * туда, куда нужно.
 *
 * Проверка на клиенте, а не на сервере, и это не каприз: в проде все страницы
 * кешируются на 15 секунд и HTML общий для всех, так что серверная ветка по
 * User-Agent означала бы, что первый зашедший решает за следующих.
 */
const route = useRoute()

const glass = ref(false)

onMounted(() => {
  // iPadOS 13+ представляется как Macintosh, поэтому проверяем и его
  glass.value = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
})
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 border-t border-rule pb-[env(safe-area-inset-bottom)] lg:hidden"
    :class="glass ? 'nav-glass' : 'bg-bg'"
    aria-label="Основная навигация"
  >
    <ul class="grid grid-cols-5">
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
          <span class="sr-only text-[11px] leading-none font-semibold xs:not-sr-only">
            {{ item.label }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
