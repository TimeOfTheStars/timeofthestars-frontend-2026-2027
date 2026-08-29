<script setup lang="ts">
import type { CompetitionPlayerWithStats, GameWithProtocol } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Страница матча: счёт в шапке, остальное — разделами.
 *
 * Разделы ссылками через ?tab=, как везде в проекте (SegmentLinks): они
 * шарятся в мессенджер, индексируются, работают без JS и корректно ходят
 * по «назад».
 *
 * А вот СТОРОНЫ протокола внутри «Статистики» по-прежнему идут стопкой, и
 * это не непоследовательность. Разделы отвечают на разные вопросы («как шла
 * игра» / «кто сколько набрал» / «что на бумаге» / «посмотреть»), а стороны —
 * на один и тот же: «кто забил». Разложи их по вкладкам — и родитель с
 * вероятностью 50% попадёт не на ту, без подсказки, что нужная фамилия в
 * одном тапе; плюс поиск по странице в мобильном браузере, реальный способ
 * найти фамилию, на скрытой панели не работает. Объёма, оправдывающего
 * разделение, тут тоже нет: любительский протокол — 5–20 строк.
 *
 * Ориентацию по сторонам даёт липкая полоса счёта с якорями; она нужна
 * только на вкладке статистики и только там показывается.
 */
const route = useRoute()

definePageMeta({
  validate: to => parseId(to.params.id) != null,
})

const id = computed(() => parseId(route.params.id)!)

const { data: game, status, error, refresh } = await usePageData(
  () => `game:${id.value}`,
  $api => $api<GameWithProtocol>(ep.game(id.value)),
  { watch: [id] },
)

const { team } = useTeamDirectory()
const { $api } = useNuxtApp()

const outcome = computed(() => (game.value ? gameOutcome(game.value) : null))
const protocol = computed(() => (game.value ? buildProtocol(game.value) : null))
const timeline = computed(() => (game.value ? buildTimeline(game.value) : null))
const time = computed(() => ruTime(game.value?.time))
const video = computed(() => parseVideo(game.value?.video_url))
const scanUrl = computed(() => mediaUrl(game.value?.scan))

/**
 * Игровые номера — ОТЛОЖЕННО и никогда блокирующе.
 *
 * competition_id известен только из ответа по матчу, поэтому запрос состава —
 * неизбежный водопад. Ждать его значило бы удвоить TTFB на wi-fi катка ради
 * двух декоративных цифр. Слот под номер зарезервирован заранее, а порядок
 * строк от номеров не зависит — поэтому их приход не сдвигает ничего.
 */
const numbers = ref(new Map<number, number | null>())

onMounted(async () => {
  const g = game.value
  if (!g || !g.player_stats.length) return
  try {
    const roster = await $api<CompetitionPlayerWithStats[]>(ep.roster(g.competition_id))
    numbers.value = new Map(roster.map(r => [r.player.id, r.number]))
  }
  catch {
    // Номера — украшение. Их отсутствие не должно ничего ломать.
  }
})

const teamAName = computed(() => team(game.value?.team_a_id ?? null)?.name ?? '')
const teamBName = computed(() => team(game.value?.team_b_id ?? null)?.name ?? '')

const showStrip = computed(() => !!protocol.value && !protocol.value.isEmpty)

const segments = computed(() => [
  { key: 'timeline', label: 'Хронология', count: game.value?.events.length || null },
  { key: 'teamstats', label: 'Статистика матча' },
  { key: 'stats', label: 'Статистика игроков', count: game.value?.player_stats.length || null },
  { key: 'scan', label: 'Скан протокола' },
  { key: 'video', label: 'Видео' },
])

/**
 * Сторона протокола на вкладке игроков. В адресе, а не в локальном ref: у
 * разделов проекта состояние живёт в query, чтобы ссылка делилась и «назад»
 * возвращал куда ушёл. Мусор молча даёт хозяев.
 */
const side = computed<'a' | 'b'>(() => (route.query.side === 'b' ? 'b' : 'a'))

function sideLink(next: 'a' | 'b') {
  return { path: route.path, query: { ...route.query, side: next } }
}

// Неизвестный ?tab= — не ошибка, а чужая или устаревшая ссылка: тихо
// открываем раздел по умолчанию, а не 404.
const tab = computed(() => {
  const t = String(route.query.tab ?? '')
  return segments.value.some(s => s.key === t) ? t : 'timeline'
})

const sectionTitle = computed(() => {
  if (tab.value === 'teamstats') return 'Итоги матча'
  if (tab.value === 'stats') return 'Статистика игроков'
  if (tab.value === 'scan') return 'Скан протокола'
  // Подпись зависит от статуса: у несыгранного матча ссылка может вести
  // только на будущую трансляцию, у сыгранного — только на запись.
  if (tab.value === 'video') return game.value?.status === 'scheduled' ? 'Трансляция' : 'Видеозапись матча'
  return 'Хронология матча'
})

useHead(() => ({
  title: game.value
    ? `${teamAName.value || 'Матч'} — ${teamBName.value}`
    : 'Матч',
}))
</script>

<template>
  <div>
    <div class="container-page py-5">
      <StaleNotice
        v-if="error && game"
        :pending="status === 'pending'"
        @refresh="refresh()"
      />

      <AppSkeleton
        v-if="status === 'pending' && !game"
        :rows="5"
        :height="44"
        rounded="rounded-lg"
      />

      <template v-else-if="game">
        <!-- Мета: стадия, дата, время, место -->
        <div class="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
          <NuxtLink
            :to="`/competitions/${game.competition_id}`"
            class="inline-flex min-h-11 items-center gap-1 font-semibold text-accent"
          >
            <AppIcon
              name="trophy"
              :size="14"
            />
            Соревнование
          </NuxtLink>
          <AppChip
            v-if="game.stage !== 'matches'"
            size="sm"
            variant="outline"
          >
            {{ STAGE_LABEL[game.stage] }}
          </AppChip>
        </div>

        <!-- Шапка счёта -->
        <header class="rounded-2xl border border-rule bg-surface p-4">
          <div class="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <NuxtLink
              v-for="(sideId, si) in [game.team_a_id, game.team_b_id]"
              :key="sideId"
              :to="team(sideId) ? teamPath(team(sideId)!) : ''"
              class="flex flex-col items-center gap-2 text-center"
              :style="{ gridColumn: si === 0 ? 1 : 3, gridRow: 1 }"
            >
              <TeamCrest
                :team="team(sideId)"
                :team-id="sideId"
                :size="48"
              />
              <span
                class="text-[15px] leading-tight"
                :class="outcome?.winnerId === sideId ? 'font-extrabold' : 'font-semibold'"
              >{{ team(sideId)?.name ?? `Команда №${sideId}` }}</span>
            </NuxtLink>

            <!-- Счёта нет → прочерк и ЯВНЫЙ чип статуса ниже.
                 Время в слот счёта не ставим: во «19:30» тоже двоеточие. -->
            <p
              class="col-start-2 row-start-1 self-center text-4xl font-extrabold tabular-nums"
              :class="!outcome?.played && 'text-muted'"
            >
              {{ game.score_team_a ?? '—' }}<span class="mx-1 text-muted">:</span>{{ game.score_team_b ?? '—' }}
            </p>
          </div>

          <!-- Статус берём из поля `status`, а не выводим из наличия счёта:
               по этому же полю разложены «Предстоящие» и «Результаты» -->
          <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
            <AppChip :variant="game.status === 'finished' ? 'accent' : 'neutral'">
              {{ STATUS_LABEL[game.status] }}
            </AppChip>
            <AppChip v-if="outcome?.unresolvedTie">
              Победитель буллитов не указан
            </AppChip>
            <AppChip v-else-if="outcome?.tied && !outcome.shootout">
              Ничья
            </AppChip>
          </div>

          <!--
            Буллиты двумя ярусами: основное время и серия буллитов отдельно.

            ⚠️ Счёта серии буллитов в API НЕТ — есть только bullet_win_team_id.
            И по правилам лиги матч идёт в таблицу как НИЧЬЯ с бонусным очком
            (обеим командам draws++, победителю +1). Поэтому второй числовой
            счёт вида «4:3» противоречил бы турнирной таблице: здесь победитель,
            а не выдуманные цифры.
          -->
          <div
            v-if="outcome?.shootout"
            class="mt-4 overflow-hidden rounded-xl border border-flag"
          >
            <dl class="divide-y divide-rule text-sm">
              <div class="flex items-center justify-between gap-3 px-3 py-2">
                <dt class="text-xs font-bold text-muted uppercase">
                  Основное время
                </dt>
                <dd class="font-bold tabular-nums">
                  {{ game.score_team_a }} : {{ game.score_team_b }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-3 bg-surface-2 px-3 py-2">
                <!--
                  Подпись яруса несёт весь смысл сама: «победа по буллитам —
                  Молния». Значка победителя здесь нет намеренно — он дублировал
                  бы эту же подпись в двух сантиметрах от неё.
                -->
                <dt class="shrink-0 text-xs font-bold text-flag uppercase">
                  Победа по буллитам
                </dt>
                <dd class="flex min-w-0 items-center gap-2">
                  <TeamCrest
                    :team="team(outcome.winnerId)"
                    :team-id="outcome.winnerId"
                    :size="22"
                  />
                  <span class="min-w-0 truncate font-bold">
                    {{ team(outcome.winnerId)?.name ?? `Команда №${outcome.winnerId}` }}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <dl class="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
            <div class="flex items-center gap-1">
              <dt class="sr-only">
                Дата
              </dt>
              <AppIcon
                name="calendar"
                :size="13"
              />
              <dd>{{ ruDate(game.date) }}</dd>
            </div>
            <div class="flex items-center gap-1">
              <dt class="sr-only">
                Время
              </dt>
              <AppIcon
                name="clock"
                :size="13"
              />
              <dd>{{ time ?? 'время уточняется' }}</dd>
            </div>
            <div
              v-if="game.location"
              class="flex items-center gap-1"
            >
              <dt class="sr-only">
                Место
              </dt>
              <AppIcon
                name="mapPin"
                :size="13"
              />
              <dd>{{ game.location }}</dd>
            </div>
          </dl>
        </header>

      </template>
      <LoadError
        v-else-if="error"
        :pending="status === 'pending'"
        @retry="refresh()"
      />
    </div>

    <!-- Таб-бар. Не липкий — как на странице соревнования: липкой здесь
         остаётся только полоса счёта, и две липкие полосы подряд съели бы
         пол-экрана телефона. -->
    <div
      v-if="game"
      class="container-page"
    >
      <SegmentLinks
        :items="segments"
        :current="tab"
        class="mb-5"
      />
    </div>

    <!--
      Переключатель сторон протокола.

      Раньше здесь была полоса счёта с якорями, и после перехода на одну
      сторону она осталась похожей на неё же — подчёркивание снизу читалось
      как «тут просто ссылки». Сегментированный контрол с гербом и заливкой
      активной половины ошибиться не даёт.

      Счёт отсюда убран: он крупно стоит в шапке матча выше, а здесь только
      мешал — из-за него на половины оставалось меньше места, и длинные
      названия обрезались.

      Липкий намеренно: переключать нужно и когда состав уже пролистан.
    -->
    <div
      v-if="game && showStrip && tab === 'stats'"
      class="sticky top-header z-20 mb-5 border-b border-rule bg-bg py-2"
    >
      <div
        class="container-page"
        role="group"
        aria-label="Команда"
      >
        <div class="flex gap-1 rounded-xl border border-rule bg-surface-2 p-1">
          <NuxtLink
            v-for="opt in [
              { key: 'a', id: game.team_a_id, name: teamAName },
              { key: 'b', id: game.team_b_id, name: teamBName },
            ]"
            :key="opt.key"
            :to="sideLink(opt.key as 'a' | 'b')"
            replace
            class="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-bold transition-colors"
            :class="side === opt.key
              ? 'bg-accent text-accent-fg'
              : 'text-muted hover:text-fg'"
            :aria-current="side === opt.key ? 'true' : undefined"
          >
            <TeamCrest
              :team-id="opt.id"
              :size="22"
            />
            <span class="truncate">{{ opt.name || `№${opt.id}` }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div
      v-if="game"
      class="container-page pb-5"
    >
      <h2 class="mb-4 text-lg font-bold">
        {{ sectionTitle }}
      </h2>

      <!-- Хронология -->
      <section v-if="tab === 'timeline'">
        <EmptyState
          v-if="!timeline || timeline.isEmpty"
          icon="clock"
          title="Хронология матча не заполнена"
          hint="Голы и удаления вносят отдельно от протокола, поэтому у сыгранного матча её может не быть."
        />
        <GameTimeline
          v-else
          :timeline="timeline"
          :game="game"
        />
      </section>

      <!-- Итоги матча: командная статистика -->
      <section v-else-if="tab === 'teamstats'">
        <EmptyState
          v-if="!game.team_stats.length"
          icon="info"
          title="Статистика матча не внесена"
          hint="Броски, вбрасывания и реализацию заносят отдельно от протокола, и пока это сделано не для всех матчей."
        />
        <GameTeamStats
          v-else
          :game="game"
        />
      </section>

      <!-- Статистика игроков -->
      <section v-else-if="tab === 'stats'">
        <!-- Протокол бывает пустым даже у сыгранного матча со счётом -->
        <EmptyState
          v-if="!protocol || protocol.isEmpty"
          icon="file"
          title="Протокол матча не опубликован"
          :hint="outcome?.played
            ? 'Счёт внесён, а состав по игрокам — ещё нет.'
            : 'Появится после матча.'"
        />

        <template v-else>
          <!-- Только выбранная сторона: вторая — по переключателю в полосе -->
          <BoxScoreSection
            :side="side === 'b' ? protocol.b : protocol.a"
            :anchor="`side-${side}`"
            :numbers="numbers"
          />

          <!-- Строки, чья команда не совпала ни с одной из сторон матча.
               Молча выбросить их нельзя: протокол разошёлся бы с шапкой счёта. -->
          <section
            v-if="protocol.orphans.length"
            class="mt-8"
          >
            <h3 class="mb-2 text-sm font-bold">
              Прочие строки протокола
            </h3>
            <p class="mb-3 text-xs text-muted">
              У этих строк указана команда, не участвующая в матче. Так бывает, если
              игрока перевели в другую команду после внесения протокола.
            </p>
            <ul class="space-y-1.5">
              <li
                v-for="(line, i) in protocol.orphans"
                :key="lineKey(line, i)"
                class="flex items-center gap-2 rounded-lg border border-rule bg-surface px-3 py-2 text-sm"
              >
                <span
                  class="min-w-0 flex-1 truncate"
                  :class="lineName(line).unnamed ? 'italic text-muted' : 'font-semibold'"
                >{{ lineName(line).text }}</span>
                <span class="shrink-0 text-xs text-muted">
                  {{ team(line.team_id)?.name ?? `команда №${line.team_id}` }}
                </span>
                <span class="shrink-0 font-bold tabular-nums">
                  {{ line.goals }}+{{ line.assists }}
                </span>
              </li>
            </ul>
          </section>
        </template>
      </section>

      <!-- Скан бумажного протокола -->
      <section v-else-if="tab === 'scan'">
        <EmptyState
          v-if="!scanUrl"
          icon="file"
          title="Скан протокола не загружен"
          hint="Бумажный протокол выкладывают после матча, и не для каждой игры."
        />

        <template v-else>
          <div class="overflow-hidden rounded-xl border border-rule bg-surface-2">
            <iframe
              v-if="isPdf(game.scan)"
              :src="scanUrl"
              title="Скан протокола матча"
              class="h-[80vh] w-full border-0"
            />
            <img
              v-else
              :src="scanUrl"
              alt="Скан протокола матча"
              loading="lazy"
              class="mx-auto block max-h-[80vh] w-auto max-w-full"
            >
          </div>

          <!--
            Атрибут download браузеры для межсайтовых ссылок игнорируют, а скан
            лежит на домене API. Значит файл откроется в новой вкладке, и уже
            оттуда его сохраняют. Принудительное скачивание — это заголовок
            Content-Disposition со стороны бэкенда, здесь его не подделать.
          -->
          <a
            :href="scanUrl"
            download
            target="_blank"
            rel="noopener"
            class="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg border border-rule text-sm font-semibold"
          >
            <AppIcon
              name="file"
              :size="16"
            />
            Скачать
            <AppIcon
              name="external"
              :size="14"
              class="text-muted"
            />
          </a>
        </template>
      </section>

      <!-- Видео -->
      <section v-else-if="tab === 'video'">
        <EmptyState
          v-if="!video"
          icon="play"
          :title="game.status === 'scheduled' ? 'Трансляция не назначена' : 'Видеозапись не привязана'"
          hint="Ссылку на видео добавляют вручную, и не у каждого матча она есть."
        />

        <!-- Плеер монтируется только на своей вкладке: на остальных разделах
             iframe в разметку не попадает и трафик не тратит. -->
        <div
          v-else-if="video.embed"
          class="mx-auto w-full max-w-4xl"
        >
          <div class="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              :src="video.embed"
              :title="sectionTitle"
              class="h-full w-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
              allowfullscreen
            />
          </div>
        </div>

        <!-- Хост не из белого списка — встроить нельзя, отдаём ссылкой -->
        <a
          v-else
          :href="video.href"
          target="_blank"
          rel="noopener"
          class="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-rule text-sm font-semibold"
        >
          <AppIcon
            name="play"
            :size="16"
          />
          Смотреть на сайте видео
          <AppIcon
            name="external"
            :size="14"
            class="text-muted"
          />
        </a>
      </section>
    </div>
  </div>
</template>
