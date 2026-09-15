<script setup lang="ts">
import type { PlayerGoalMoment } from '#shared/types/api'

/**
 * Моменты голов игрока: список с плеером, который раскрывается прямо в строке.
 *
 * Плеер монтируется ТОЛЬКО у открытой строки и исчезает при закрытии — это то
 * же правило, что записано в докстринге parseVideo: чужой iframe не грузится,
 * пока человек не попросил. Открытых строк всегда не больше одной, иначе на
 * wi-fi катка в фоне буферизовались бы два видео сразу.
 *
 * Какая строка открыта — состояние компонента, а не адреса. Правило «состояние
 * в URL» в проекте про то, что человек захочет переслать: вид списка, фильтр,
 * вкладку. Ссылка с заранее открытым плеером, наоборот, смонтировала бы iframe
 * тому, кто ни на что не нажимал. Раскрытая строка таблицы сделана так же —
 * см. StandingsTable.
 */
const props = defineProps<{ moments: PlayerGoalMoment[] }>()

const games = computed(() => groupMomentsByGame(props.moments))

const open = ref<number | null>(null)

/** Ссылка на плеер с нужной секунды; null — хост не из белого списка. */
function embedOf(m: PlayerGoalMoment): string | null {
  return videoEmbedAt(m.video_url, m.video_seconds)?.embed ?? null
}

async function toggle(m: PlayerGoalMoment, event: MouseEvent) {
  if (open.value === m.event_id) {
    open.value = null
    return
  }

  open.value = m.event_id

  // Раскрытая строка может оказаться за нижним краем: плеер занимает высоту
  // 16:9, а нажимают чаще по последнему моменту. Подтягиваем минимально —
  // 'nearest' не дёргает страницу, если всё и так видно.
  await nextTick()
  const row = (event.currentTarget as HTMLElement | null)?.closest('li')
  row?.scrollIntoView({ block: 'nearest' })
}

// Переход с игрока на игрока переиспользует компонент: без сброса осталась бы
// открытая строка с чужим id — и плеер не показался бы нигде.
watch(() => props.moments, () => {
  open.value = null
})
</script>

<template>
  <ol class="space-y-3">
    <li
      v-for="game in games"
      :key="game.gameId"
      class="overflow-hidden rounded-xl border border-rule bg-surface"
    >
      <!-- Шапка матча: соперник, дата, счёт. Одна на все моменты этой игры. -->
      <NuxtLink
        :to="gamePath(game.gameId)"
        class="flex min-h-14 items-center gap-2.5 border-b border-rule px-3 py-2"
      >
        <TeamCrest
          :team="game.opponent"
          :size="32"
        />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold">
            с командой «{{ game.opponent.name }}»
          </span>
          <span class="mt-0.5 block truncate text-xs text-muted">
            {{ ruDateShort(game.date) }} · {{ game.competitionName }}
          </span>
        </span>
        <span
          v-if="game.scoreFor != null && game.scoreAgainst != null"
          class="shrink-0 text-sm font-extrabold tabular-nums"
        >{{ game.scoreFor }}:{{ game.scoreAgainst }}</span>
      </NuxtLink>

      <ul>
        <!-- scroll-mb: снизу висит плавающая панель навигации, и без запаса
             подтянутая строка оказалась бы наполовину под ней. -->
        <li
          v-for="m in game.moments"
          :key="m.event_id"
          class="scroll-mb-24 border-t border-rule first:border-t-0 lg:scroll-mb-4"
        >
          <!-- Встраиваемый хост: кнопка-раскрытие. -->
          <button
            v-if="embedOf(m)"
            type="button"
            class="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
            :aria-expanded="open === m.event_id"
            :aria-controls="`moment-${m.event_id}`"
            :aria-label="momentLabel(m)"
            @click="toggle(m, $event)"
          >
            <AppIcon
              name="play"
              :size="18"
              class="text-accent"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ momentTitle(m) }}</span>
              <span
                v-if="momentAssists(m)"
                class="mt-0.5 block truncate text-xs text-muted"
              >{{ momentAssists(m) }}</span>
            </span>
            <AppIcon
              :name="open === m.event_id ? 'chevronUp' : 'chevronDown'"
              :size="16"
              class="text-muted"
            />
          </button>

          <!-- Хост не из белого списка: встроить нечего, уводим на видео.
               Это другой элемент, а не выключенная кнопка: и ведёт себя иначе,
               и читается иначе. -->
          <a
            v-else
            :href="m.video_at_url"
            target="_blank"
            rel="noopener"
            class="flex min-h-14 items-center gap-3 px-3 py-2"
          >
            <AppIcon
              name="play"
              :size="18"
              class="text-accent"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ momentTitle(m) }}</span>
              <span
                v-if="momentAssists(m)"
                class="mt-0.5 block truncate text-xs text-muted"
              >{{ momentAssists(m) }}</span>
            </span>
            <AppIcon
              name="external"
              :size="14"
              class="text-muted"
            />
          </a>

          <div
            v-if="open === m.event_id"
            :id="`moment-${m.event_id}`"
            class="px-3 pb-3"
          >
            <div class="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <!-- key по событию: без него Vue переиспользовал бы один iframe
                   между моментами, и плеер остался бы на прежней секунде. -->
              <iframe
                :key="m.event_id"
                :src="embedOf(m)!"
                :title="momentTitle(m)"
                class="h-full w-full border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
                allowfullscreen
              />
            </div>

            <!-- Страховка: перемотался ли встроенный плеер, страница узнать не
                 может (чужой iframe молчит). Эта ссылка открывает момент на
                 сайте VK и работает наверняка. -->
            <a
              :href="m.video_at_url"
              target="_blank"
              rel="noopener"
              class="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted"
            >
              Открыть в VK
              <AppIcon
                name="external"
                :size="14"
              />
            </a>
          </div>
        </li>
      </ul>
    </li>
  </ol>
</template>
