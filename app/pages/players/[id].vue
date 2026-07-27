<script setup lang="ts">
import type { Game, Player, PlayerStatsBreakdown } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Страница игрока.
 *
 * `stats` сразу даёт всё: career, by_competition и by_team — с названиями,
 * поэтому за названиями ходить не надо. Query-фильтры этой ручки меняют
 * только `career`, а разбивки всегда по всей карьере, — значит «статистика
 * в этом соревновании» берётся из by_competition без доп. запроса.
 */
const route = useRoute()

definePageMeta({
  validate: to => parseId(to.params.id) != null,
})

const id = computed(() => parseId(route.params.id)!)

const { data, status, error, refresh } = await usePageData(
  () => `player:${id.value}`,
  async ($api) => {
    const [player, stats, games] = await Promise.all([
      $api<Player>(ep.player(id.value)),
      $api<PlayerStatsBreakdown>(ep.playerStats(id.value)),
      $api<Game[]>(ep.playerGames(id.value)),
    ])
    return { player, stats, games }
  },
  { watch: [id] },
)

const player = computed(() => data.value?.player ?? null)
const career = computed(() => data.value?.stats.career ?? null)

/**
 * Вратарские колонки показываем, только если они осмысленны: у полевых
 * игроков эти поля всегда 0, и рисовать им «0 сэйвов» — шум.
 */
const isGoalie = computed(() => {
  const c = career.value
  return (
    player.value?.position === 'вратарь'
    || !!c && (c.saves > 0 || c.goals_against > 0 || c.minutes_played > 0)
  )
})

const playerAge = computed(() => age(player.value?.birth_date))

const thBase
  = 'border-b border-rule-strong py-2 text-xs font-bold uppercase tracking-wide text-muted'
const tdBase = 'border-b border-rule py-2 text-right tabular-nums'

useHead(() => ({ title: player.value?.full_name ?? 'Игрок' }))
useSeoMeta({
  description: () =>
    player.value
      ? `${player.value.full_name} — статистика в лиге «Время звёзд»: голы, передачи, очки по соревнованиям и командам.`
      : '',
})
</script>

<template>
  <div class="container-page py-5">
    <StaleNotice
      v-if="error && data"
      :pending="status === 'pending'"
      @refresh="refresh()"
    />

    <AppSkeleton
      v-if="status === 'pending' && !data"
      :rows="5"
      :height="44"
      rounded="rounded-lg"
    />

    <template v-else-if="player && career">
      <header class="mb-6 flex items-start gap-4">
        <PlayerAvatar
          :player="player"
          :size="72"
        />
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-extrabold sm:text-2xl">
            {{ player.full_name }}
          </h1>
          <!-- Каждое поле показываем только если оно есть: birth_date, position
               и grip в живой базе чаще всего null -->
          <div class="mt-2 flex flex-wrap gap-1.5">
            <AppChip v-if="player.position">
              {{ player.position }}
            </AppChip>
            <AppChip v-if="playerAge != null">
              {{ pluralWith(playerAge, ['год', 'года', 'лет']) }}
            </AppChip>
            <AppChip v-if="player.grip">
              Хват: {{ player.grip }}
            </AppChip>
          </div>
        </div>
      </header>

      <!-- Карьера -->
      <section class="mb-8">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-lg font-bold">
            За карьеру
          </h2>
          <RefreshButton
            :pending="status === 'pending'"
            @refresh="refresh()"
          />
        </div>

        <dl class="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <div
            v-for="item in [
              { label: 'Матчи', value: career.games },
              { label: 'Голы', value: career.goals },
              { label: 'Передачи', value: career.assists },
              { label: 'Очки', value: career.points },
              { label: 'Штраф', value: career.penalties },
            ]"
            :key="item.label"
            class="rounded-xl border border-rule bg-surface p-3 text-center"
          >
            <dt class="text-xs text-muted">
              {{ item.label }}
            </dt>
            <dd class="mt-0.5 text-xl font-extrabold tabular-nums">
              {{ item.value }}
            </dd>
          </div>
        </dl>

        <dl
          v-if="isGoalie"
          class="mt-2 grid grid-cols-3 gap-2"
        >
          <div
            v-for="item in [
              { label: 'Сэйвы', value: career.saves },
              { label: 'Пропущено', value: career.goals_against },
              { label: 'Минуты', value: career.minutes_played },
            ]"
            :key="item.label"
            class="rounded-xl border border-rule bg-surface p-3 text-center"
          >
            <dt class="text-xs text-muted">
              {{ item.label }}
            </dt>
            <dd class="mt-0.5 text-xl font-extrabold tabular-nums">
              {{ item.value }}
            </dd>
          </div>
        </dl>

        <p class="mt-3 text-xs text-muted">
          Учитываются все стадии всех соревнований. Матчи — это игры, где игрок
          есть в протоколе.
        </p>
      </section>

      <!-- По соревнованиям -->
      <section
        v-if="data!.stats.by_competition.length"
        class="mb-8"
      >
        <h2 class="mb-3 text-lg font-bold">
          По соревнованиям
        </h2>
        <table class="table-bleed table-fixed border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th
                scope="col"
                class="pl-4 text-left"
                :class="thBase"
              >
                Соревнование
              </th>
              <th
                scope="col"
                class="w-8 text-right"
                :class="thBase"
              >
                <abbr
                  title="Игры"
                  class="no-underline"
                >И</abbr>
              </th>
              <th
                scope="col"
                class="w-8 text-right"
                :class="thBase"
              >
                <abbr
                  title="Голы"
                  class="no-underline"
                >Г</abbr>
              </th>
              <th
                scope="col"
                class="w-8 text-right"
                :class="thBase"
              >
                <abbr
                  title="Передачи"
                  class="no-underline"
                >П</abbr>
              </th>
              <th
                scope="col"
                class="w-9 pr-4 text-right"
                :class="thBase"
              >
                <abbr
                  title="Очки"
                  class="no-underline"
                >О</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in data!.stats.by_competition"
              :key="row.competition_id"
              :class="i % 2 === 1 && 'bg-surface-2'"
            >
              <th
                scope="row"
                class="border-b border-rule py-2 pl-4 text-left font-normal"
              >
                <NuxtLink
                  :to="`/competitions/${row.competition_id}`"
                  class="flex min-h-11 items-center font-semibold"
                >
                  <span class="truncate">{{ row.competition_name }}</span>
                </NuxtLink>
              </th>
              <td :class="[tdBase, 'w-8']">
                {{ row.totals.games }}
              </td>
              <td :class="[tdBase, 'w-8']">
                {{ statNum(row.totals.goals, row.totals.games) }}
              </td>
              <td :class="[tdBase, 'w-8']">
                {{ statNum(row.totals.assists, row.totals.games) }}
              </td>
              <td :class="[tdBase, 'w-9 pr-4 font-bold']">
                {{ statNum(row.totals.points, row.totals.games) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- По командам -->
      <section
        v-if="data!.stats.by_team.length"
        class="mb-8"
      >
        <h2 class="mb-3 text-lg font-bold">
          По командам
        </h2>
        <ul class="space-y-2">
          <li
            v-for="row in data!.stats.by_team"
            :key="row.team_id"
          >
            <NuxtLink
              :to="`/teams/${row.team_id}`"
              class="flex items-center gap-3 rounded-xl border border-rule bg-surface p-3"
            >
              <TeamCrest
                :team-id="row.team_id"
                :size="32"
              />
              <span class="min-w-0 flex-1 truncate font-semibold">{{ row.team_name }}</span>
              <span class="shrink-0 text-right text-xs text-muted tabular-nums">
                {{ pluralWith(row.totals.games, ['матч', 'матча', 'матчей']) }}
              </span>
              <span class="w-9 shrink-0 text-right font-bold tabular-nums">
                {{ row.totals.points }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- Матчи -->
      <section>
        <h2 class="mb-1 text-lg font-bold">
          Матчи
        </h2>
        <p class="mb-3 text-xs text-muted">
          Только игры, где игрок есть в протоколе, — не все матчи его команды.
        </p>
        <GameList
          :games="data!.games"
          show-stage
          empty-title="Матчей с участием игрока пока нет"
          empty-hint="Игрок появится здесь, когда его внесут в протокол матча."
        />
      </section>
    </template>

    <LoadError
      v-else-if="error"
      :pending="status === 'pending'"
      @retry="refresh()"
    />
  </div>
</template>
