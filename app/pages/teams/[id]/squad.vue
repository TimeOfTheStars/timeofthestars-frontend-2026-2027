<script setup lang="ts">
import type { Competition, CompetitionPlayerWithStats, Game, Team } from '#shared/types/api'
import { ep, teamGamesQuery } from '#shared/utils/endpoints'

/**
 * Состав команды для печати.
 *
 * PDF собирает сам браузер: «Сохранить как PDF» в диалоге печати. Своей
 * библиотеки нет намеренно — jsPDF это +100 КБ плюс столько же на
 * кириллический шрифт, и всё ради одной страницы.
 *
 * Чтобы файл весил сотню килобайт, а не мегабайт, фотографии перед печатью
 * уменьшаются через canvas: исходники 468×700 по 24 КБ, на команду их два
 * десятка. Уменьшенные подставляются в src, и в PDF попадают уже они.
 *
 * Отсюда же прокси /photo: на /media у API нет заголовков CORS, холст с
 * таким изображением становится «испорченным», и toDataURL бросает
 * SecurityError. Через свой домен ограничение не действует.
 */
const route = useRoute()

const id = computed(() => parseId(route.params.id)!)

definePageMeta({
  validate: to => parseId(to.params.id) != null,
})

const { data, status, error, refresh } = await usePageData(
  () => `squad:${id.value}`,
  async ($api) => {
    const [team, games] = await Promise.all([
      $api<Team>(ep.team(id.value)),
      $api<Game[]>(ep.games, { query: teamGamesQuery(id.value) }),
    ])

    // Состав живёт в соревнованиях, а не у команды: берём те, где она играет.
    const compIds = [...new Set(games.map(g => g.competition_id))]
    const [competitions, rosters] = await Promise.all([
      Promise.all(compIds.map(cid => $api<Competition>(ep.competition(cid)).catch(() => null))),
      Promise.all(compIds.map(cid =>
        $api<CompetitionPlayerWithStats[]>(ep.roster(cid)).catch(() => [] as CompetitionPlayerWithStats[]),
      )),
    ])

    return {
      team,
      rosters: compIds.map((cid, i) => ({
        competition: competitions[i] ?? null,
        competitionId: cid,
        players: (rosters[i] ?? []).filter(p => p.team_id === id.value),
      })).filter(r => r.players.length > 0),
    }
  },
  { watch: [id] },
)

/**
 * Уменьшенные фотографии: player_id → data URL.
 *
 * Готовятся на клиенте после отрисовки. Пока не готовы, показывается
 * оригинал через прокси — страница остаётся полезной, даже если canvas
 * почему-то не отработал.
 */
const thumbs = ref(new Map<number, string>())
const preparing = ref(false)

/** Ссылка на фото через свой домен: нужно для canvas, см. докстринг файла. */
function proxied(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null
  const file = photoUrl.split('/').pop()
  return file ? `/photo/${file}` : null
}

/**
 * 96×144 при JPEG 0.72 — примерно 4 КБ на игрока. На состав из 25 фото это
 * около сотни килобайт вместо шестисот у оригиналов. Для печатной таблички
 * этого разрешения достаточно: фото там шириной около сантиметра.
 */
const THUMB_W = 96
const THUMB_H = 144

function shrink(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = THUMB_W
        canvas.height = THUMB_H
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        // cover: пропорции не искажаем, лишнее обрезаем по краям
        const scale = Math.max(THUMB_W / img.width, THUMB_H / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      catch {
        // Испорченный холст или отказ кодировщика — не повод ронять страницу
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function prepareThumbs() {
  if (preparing.value || thumbs.value.size) return
  preparing.value = true
  const all = (data.value?.rosters ?? []).flatMap(r => r.players)
  await Promise.all(all.map(async (p) => {
    const src = proxied(p.player.photo_url)
    if (!src) return
    const small = await shrink(src)
    if (small) thumbs.value.set(p.player.id, small)
  }))
  preparing.value = false
}

onMounted(prepareThumbs)

async function print() {
  // Если фото ещё не уменьшены — дождаться: иначе в PDF уедут оригиналы
  await prepareThumbs()
  await nextTick()
  window.print()
}

const teamName = computed(() => data.value?.team.name ?? '')
const totalPlayers = computed(() =>
  (data.value?.rosters ?? []).reduce((n, r) => n + r.players.length, 0),
)

useHead(() => ({ title: teamName.value ? `Состав — ${teamName.value}` : 'Состав команды' }))
</script>

<template>
  <div class="container-page py-5">
    <!-- Шапка страницы. В печать не идёт: в PDF нужен состав, а не кнопки. -->
    <div class="print:hidden">
      <NuxtLink
        v-if="data"
        :to="teamPath(data.team)"
        class="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted"
      >
        <AppIcon
          name="arrowLeft"
          :size="16"
        />
        {{ teamName }}
      </NuxtLink>

      <StaleNotice
        v-if="error && data"
        :pending="status === 'pending'"
        @refresh="refresh()"
      />
    </div>

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="6"
      :height="56"
      rounded="rounded-xl"
    />

    <template v-else-if="data && totalPlayers">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-extrabold">
            {{ teamName }}
          </h1>
          <p class="mt-0.5 text-xs text-muted print:hidden">
            {{ pluralWith(totalPlayers, ['игрок', 'игрока', 'игроков']) }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex min-h-12 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-accent-fg print:hidden"
          @click="print"
        >
          <AppIcon
            name="file"
            :size="16"
          />
          {{ preparing ? 'Готовим…' : 'Скачать PDF' }}
        </button>
      </div>

      <section
        v-for="entry in data.rosters"
        :key="entry.competitionId"
        class="mb-8 last:mb-0"
      >
        <h2 class="mb-2 text-sm font-bold">
          {{ entry.competition?.name ?? `Соревнование №${entry.competitionId}` }}
        </h2>

        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <li
            v-for="p in entry.players"
            :key="p.player.id"
            class="flex break-inside-avoid items-center gap-2.5 rounded-xl border border-rule bg-surface p-2.5 print:rounded-none print:border-rule-strong print:bg-transparent print:p-1.5"
          >
            <!--
              Пока миниатюра не готова, показываем оригинал через прокси:
              страница остаётся полезной, даже если canvas не отработал.
              width/height заданы всегда — без них строка прыгает при загрузке.
            -->
            <img
              v-if="proxied(p.player.photo_url)"
              :src="thumbs.get(p.player.id) ?? proxied(p.player.photo_url)!"
              :alt="p.player.full_name"
              width="48"
              height="72"
              loading="lazy"
              decoding="async"
              class="h-[72px] w-12 shrink-0 rounded-md object-cover print:h-[54px] print:w-9"
            >
            <span
              v-else
              class="grid h-[72px] w-12 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted print:h-[54px] print:w-9"
              aria-hidden="true"
            >{{ playerInitials(p.player.full_name) }}</span>

            <span class="min-w-0 flex-1">
              <span class="flex items-baseline gap-1.5">
                <span
                  v-if="p.number != null"
                  class="text-sm font-extrabold tabular-nums"
                >{{ p.number }}</span>
                <span class="min-w-0 text-sm leading-snug font-semibold break-words">
                  {{ p.player.full_name }}
                </span>
              </span>
              <span
                v-if="p.player.position"
                class="mt-0.5 block text-xs text-muted"
              >{{ p.player.position }}</span>
            </span>
          </li>
        </ul>
      </section>
    </template>

    <LoadError
      v-else-if="error"
      :pending="status === 'pending'"
      @retry="refresh()"
    />

    <EmptyState
      v-else
      icon="users"
      variant="page"
      title="Состав не заполнен"
      hint="Игроки появятся, когда организаторы внесут заявку команды на соревнование."
    />
  </div>
</template>
