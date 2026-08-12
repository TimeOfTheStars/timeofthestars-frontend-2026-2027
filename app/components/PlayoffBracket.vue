<script setup lang="ts">
import type { Game } from '#shared/types/api'

/**
 * Сетка плей-офф.
 *
 * • До lg — вертикальные секции по стадиям (1/4 → 1/2 → Финал) с ЛИПКИМИ
 *   заголовками. Классическое дерево слева-направо на 375px непригодно, а
 *   липкий заголовок бесплатно отвечает «какой это раунд», поэтому степпер и
 *   табы не нужны: они стоят тап и теряют контекст.
 *
 * • Ниже lg НЕТ overflow-x-auto: скролл-контейнер стал бы содержащим блоком
 *   для sticky, и заголовки стадий перестали бы липнуть.
 *
 * • С lg те же секции становятся колонками грида, и появляются соединители —
 *   но только если сетка каноническая (см. buildBracket). Соединители — это
 *   короткие отводы на самой карточке, а НЕ сквозное дерево: кто с кем сходится
 *   в следующем раунде, данные достоверно не сообщают, и рисовать конкретные
 *   пары значило бы придумывать. Отводы показывают направление, ничего не
 *   утверждая о парах.
 */
const props = defineProps<{
  games: Game[]
  winnerTeamId?: number | null
}>()

const { team } = useTeamDirectory()

const bracket = computed(() => buildBracket(props.games))
const champion = computed(() => team(props.winnerTeamId ?? null))

const cols = computed(() => bracket.value.groups.length)
</script>

<template>
  <div v-if="bracket.groups.length">
    <p
      v-if="!bracket.canonical"
      class="mb-4 flex items-start gap-2 rounded-xl border border-rule bg-surface-2 px-3 py-2.5 text-xs text-muted"
    >
      <AppIcon
        name="info"
        :size="16"
        class="mt-0.5 shrink-0"
      />
      <span>
        Стадии показаны списком: по внесённым данным сетка не складывается
        в полное дерево. Это нормально, пока плей-офф идёт или заполнен частично.
      </span>
    </p>

    <div
      class="lg:grid lg:items-stretch lg:gap-12"
      :style="cols > 1 ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined"
    >
      <!--
        lg:flex flex-col — не украшение. Список пар должен занимать ВСЮ
        оставшуюся высоту колонки, но именно оставшуюся: с `h-full` он брал
        100% высоты секции, начинаясь при этом ниже заголовка стадии, и
        свисал за её нижнюю границу ровно на высоту заголовка — накрывая
        плашку чемпиона. flex-1 отмеряет остаток честно.
      -->
      <section
        v-for="(group, gi) in bracket.groups"
        :key="group.stage"
        class="mb-6 last:mb-0 lg:mb-0 lg:flex lg:flex-col"
        :aria-labelledby="`bk-${group.stage}`"
      >
        <h3
          :id="`bk-${group.stage}`"
          class="sticky top-header z-10 -mx-4 mb-3 bg-bg px-4 py-1.5 text-xs font-bold text-muted lg:static lg:mx-0 lg:px-0"
        >
          {{ STAGE_LABEL[group.stage] }}
        </h3>

        <ol
          class="space-y-3 lg:grid lg:flex-1 lg:content-around lg:space-y-0 lg:gap-6"
        >
          <li
            v-for="tie in group.ties"
            :key="tie.key"
            :data-out="bracket.canonical && gi < cols - 1 ? '' : undefined"
            :data-in="bracket.canonical && gi > 0 ? '' : undefined"
            class="bk-cell"
          >
            <BracketTie :tie="tie" />
          </li>
        </ol>
      </section>
    </div>

    <!-- Чемпион — только когда организаторы явно указали winner_team_id -->
    <NuxtLink
      v-if="champion"
      :to="teamPath(champion)"
      class="mt-6 flex items-center gap-3 rounded-xl border-2 border-accent bg-surface p-4"
    >
      <TeamCrest
        :team="champion"
        :size="48"
      />
      <span class="min-w-0 flex-1">
        <span class="block text-xs font-bold text-muted uppercase">Чемпион</span>
        <span class="block truncate text-lg font-extrabold">{{ champion.name }}</span>
      </span>
      <AppIcon
        name="trophy"
        :size="28"
        class="text-accent"
      />
    </NuxtLink>
  </div>

  <EmptyState
    v-else
    icon="calendar"
    title="Матчей плей-офф пока нет"
    hint="Сетка появится, когда организаторы внесут матчи стадий 1/4, 1/2 или финала."
  />
</template>
