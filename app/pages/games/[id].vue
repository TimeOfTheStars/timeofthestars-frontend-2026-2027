<script setup lang="ts">
import type { CompetitionPlayerWithStats, GameWithProtocol } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Страница матча: счёт + протокол по сторонам.
 *
 * Обе стороны идут СТОПКОЙ, а не табами. Табы проигрывают: главный вопрос
 * страницы — «кто забил» — охватывает обе команды, и родитель с вероятностью
 * 50% попадает не на ту вкладку без подсказки, что нужное имя в одном тапе;
 * поиск по странице в мобильном браузере (реальный способ найти фамилию)
 * на скрытой панели не работает; а объёма, который оправдывал бы табы, тут нет —
 * любительский протокол это 5–20 строк, часто пустой.
 *
 * Ориентацию даёт липкая полоса счёта с якорями — она работает как таб-бар,
 * только контент, на который она указывает, уже на странице.
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

          <!-- Статус есть у КАЖДОГО матча, а не только у запланированных -->
          <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
            <AppChip :variant="outcome?.played ? 'accent' : 'neutral'">
              {{ outcome?.played ? STATUS_LABEL.finished : STATUS_LABEL.scheduled }}
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

        <!-- Скан протокола и видео -->
        <div
          v-if="scanUrl || video"
          class="mt-4 flex flex-wrap gap-2"
        >
          <a
            v-if="scanUrl"
            :href="scanUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold"
          >
            <AppIcon
              name="file"
              :size="16"
            />
            {{ isPdf(game.scan) ? 'Протокол (PDF)' : 'Скан протокола' }}
            <AppIcon
              name="external"
              :size="14"
              class="text-muted"
            />
          </a>

          <a
            v-if="video"
            :href="video.href"
            target="_blank"
            rel="noopener"
            class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold"
          >
            <AppIcon
              name="play"
              :size="16"
            />
            Видео матча
            <AppIcon
              name="external"
              :size="14"
              class="text-muted"
            />
          </a>
        </div>
      </template>
      <LoadError
        v-else-if="error"
        :pending="status === 'pending'"
        @retry="refresh()"
      />
    </div>

    <!-- Липкая полоса счёта = таб-бар, только контент уже на странице.
         Ноль JS, никакого role="tablist" с блуждающим tabindex. -->
    <div
      v-if="game && showStrip"
      class="sticky top-header z-20 border-y border-rule bg-bg"
    >
      <div class="container-page flex h-12 items-center gap-2 text-sm">
        <a
          href="#side-a"
          class="flex min-h-11 min-w-0 flex-1 items-center justify-end gap-2 font-semibold"
        >
          <span class="truncate">{{ teamAName || `№${game.team_a_id}` }}</span>
        </a>
        <span class="shrink-0 font-extrabold tabular-nums">
          {{ game.score_team_a ?? '—' }} : {{ game.score_team_b ?? '—' }}
        </span>
        <a
          href="#side-b"
          class="flex min-h-11 min-w-0 flex-1 items-center gap-2 font-semibold"
        >
          <span class="truncate">{{ teamBName || `№${game.team_b_id}` }}</span>
        </a>
      </div>
    </div>

    <div
      v-if="game && protocol"
      class="container-page py-5"
    >
      <!-- Якорь для кнопки «Протокол» в карточках матчей -->
      <h2
        id="protocol"
        class="mb-4 scroll-mt-28 text-lg font-bold"
      >
        Протокол матча
      </h2>

      <!-- Протокол бывает пустым даже у сыгранного матча со счётом -->
      <EmptyState
        v-if="protocol.isEmpty"
        icon="file"
        title="Протокол матча не опубликован"
        :hint="outcome?.played
          ? 'Счёт внесён, а состав по игрокам — ещё нет.'
          : 'Появится после матча.'"
      />

      <template v-else>
        <div class="space-y-8">
          <BoxScoreSection
            :side="protocol.a"
            anchor="side-a"
            :numbers="numbers"
          />
          <BoxScoreSection
            :side="protocol.b"
            anchor="side-b"
            :numbers="numbers"
          />
        </div>

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
    </div>
  </div>
</template>
