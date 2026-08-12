<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-12 border-t border-rule bg-surface-2">
    <div class="container-page py-8">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <img
            src="/brand/logo-vremya-zvezd-128.png"
            alt=""
            width="44"
            height="44"
            class="size-11 shrink-0"
          >
          <div>
            <p class="text-sm font-extrabold tracking-tight">
              ВРЕМЯ ЗВЁЗД
            </p>
            <!-- Понятия «сезон» в API нет вообще: у соревнования есть только
                 start_date / end_date. Захардкоженный «Сезон 2026/2027» был
                 бы утверждением, которое нечем подтвердить и которое молча
                 устареет. Сроки показываются там, где они реально есть, —
                 на карточке соревнования. -->
            <p class="mt-0.5 text-xs text-muted">
              Регулярные хоккейные игры и турниры
            </p>
          </div>
        </div>

        <nav aria-label="Разделы сайта">
          <ul class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-1">
            <li
              v-for="item in DESKTOP_NAV"
              :key="item.to"
            >
              <NuxtLink
                :to="item.to"
                class="inline-flex min-h-11 items-center text-muted transition-colors hover:text-fg"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <p class="mt-8 border-t border-rule pt-5 text-xs text-muted">
        Результаты, составы и статистика публикуются организаторами лиги.
        Статистика пересчитывается по протоколам матчей и обновляется сразу после их внесения.
      </p>
      <p class="mt-2 text-xs text-muted">
        © {{ year }} Время звёзд
      </p>
    </div>
  </footer>
</template>
