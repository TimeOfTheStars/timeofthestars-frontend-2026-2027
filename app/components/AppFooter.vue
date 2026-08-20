<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-12 border-t border-rule bg-surface-2">
    <div class="container-page py-8">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <!-- Широкий файл: квадратные PNG растянуты по вертикали.
               Пропорция 428:309, при высоте 44 ширина 61. -->
          <img
            src="/brand/logo-vremya-zvezd-wide.webp"
            alt=""
            width="61"
            height="44"
            class="h-11 w-auto shrink-0"
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

            <!--
              Ссылка на архив прошлого сезона. Это отдельный сайт на своём
              поддомене, а не раздел этого, поэтому обычная внешняя ссылка.

              Год в подписи тут допустим, в отличие от «Сезон 2026/2027» выше:
              он называет конкретный адрес, а не утверждает что-то про текущие
              данные, которых в API всё равно нет.
            -->
            <a
              href="https://season-2025-2026.timeofthestars.ru"
              target="_blank"
              rel="noopener"
              class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule bg-surface px-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
            >
              Сезон 2025–2026
              <AppIcon
                name="external"
                :size="14"
                class="text-muted"
              />
            </a>
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
