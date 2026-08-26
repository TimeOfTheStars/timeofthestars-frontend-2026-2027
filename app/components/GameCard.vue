<script setup lang="ts">
import type { Game } from '#shared/types/api'

/**
 * Карточка матча в списке.
 *
 * Команды идут стопкой, а не в два столбца: на 375px названиям нужна вся
 * ширина, иначе «Академия хоккея имени…» превращается в «Акад…».
 *
 * Команда A ВСЕГДА первой: score_team_a привязан к team_a_id, и переставлять
 * их, чтобы победитель был сверху, — значит разойтись с протоколом матча
 * и с админкой. Победителя выделяем начертанием и меткой, а не порядком.
 *
 * Структура: ссылка на матч и кнопка протокола — СОСЕДИ, а не вложены друг
 * в друга. Ссылка внутри ссылки — невалидная разметка и ловушка для
 * скринридера и клавиатуры.
 */
const props = withDefaults(
  defineProps<{
    game: Game
    showStage?: boolean
    /**
     * Название соревнования. Нужно только в календаре, где соревнования
     * смешаны: без ярлыка непонятно, из какого турнира матч. В Game этого
     * поля нет, поэтому название приходит снаружи.
     */
    competitionName?: string | null
  }>(),
  { showStage: false },
)

const { team } = useTeamDirectory()
const outcome = computed(() => gameOutcome(props.game))
const time = computed(() => ruTime(props.game.time))

const sides = computed(() => [
  { id: props.game.team_a_id, score: props.game.score_team_a },
  { id: props.game.team_b_id, score: props.game.score_team_b },
])
</script>

<template>
  <!--
    flex-col + mt-auto на кнопке: в карусели карточки растягиваются на общую
    высоту (h-full приходит извне), и у незавершённого матча, где контента
    меньше, кнопка повисала посреди карточки, а под ней зияла пустота.
    В обычных списках карточка не растягивается, и колонка ведёт себя как блок.
  -->
  <article class="reveal flex flex-col overflow-hidden rounded-xl border border-rule bg-surface transition-colors hover:border-rule-strong">
    <NuxtLink
      :to="gamePath(game.id)"
      class="block p-3"
    >
      <!-- Мета-строка: дата, время, место. Время НЕ ставим в слот счёта —
           двоеточие во «19:30» читается как счёт. -->
      <div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span class="font-semibold">{{ ruDateShort(game.date) }}</span>
        <span aria-hidden="true">·</span>
        <span v-if="time">{{ time }}</span>
        <span v-else>время уточняется</span>

        <template v-if="game.location">
          <span aria-hidden="true">·</span>
          <span class="min-w-0 truncate">{{ game.location }}</span>
        </template>
      </div>

      <!--
        Статус есть у КАЖДОГО матча, а не только у запланированных.

        Берём поле `status` из API, а не выводим его из наличия счёта. Сервер
        выставляет `finished` сам, когда внесены оба счёта, — то есть значения
        совпадают, но источником должно быть поле: по нему же разложены
        разделы «Предстоящие» и «Результаты», и подпись не может с ними
        разойтись.
      -->
      <div class="mb-2.5 flex flex-wrap items-center gap-1.5">
        <AppChip
          size="sm"
          :variant="game.status === 'finished' ? 'accent' : 'neutral'"
        >
          {{ STATUS_LABEL[game.status] }}
        </AppChip>
        <AppChip
          v-if="competitionName"
          size="sm"
          variant="outline"
        >
          {{ competitionName }}
        </AppChip>
        <AppChip
          v-if="showStage && game.stage !== 'matches'"
          size="sm"
          variant="outline"
        >
          {{ STAGE_SHORT[game.stage] }}
        </AppChip>
      </div>

      <ul class="space-y-1.5">
        <li
          v-for="side in sides"
          :key="side.id"
          class="flex items-center gap-2"
        >
          <TeamCrest
            :team="team(side.id)"
            :team-id="side.id"
            :size="26"
          />
          <span
            class="min-w-0 flex-1 truncate text-sm"
            :class="
              outcome.winnerId === side.id
                ? 'font-bold'
                : outcome.played && outcome.winnerId ? 'font-medium text-muted' : 'font-semibold'
            "
          >{{ team(side.id)?.name ?? `Команда №${side.id}` }}</span>

          <!--
            Метка только при буллитах: там счёт равный и по цифрам победителя
            не видно. При обычной победе более высокий счёт говорит сам за себя,
            и метка была бы шумом.

            Буква «Б» без значка: галочка означает «отмечено/сделано», а не
            «победил», и рядом со счётом читается двусмысленно. «Б» — та же
            буква, которой в турнирной таблице подписана колонка очков за
            буллиты, то есть по сайту она уже знакома.
          -->
          <!--
            `relative` здесь обязателен. Внутри лежит .sr-only, а это
            position:absolute; без позиционированного предка он позиционируется
            от корня документа, вырывается из горизонтального скролл-контейнера
            карусели и растягивает страницу (проверено: 375 → 10364px).
            overflow-hidden на карточке его не ловит, т.к. карточка static.
          -->
          <span
            v-if="outcome.shootout && outcome.winnerId === side.id"
            class="relative inline-flex shrink-0 items-center rounded-md bg-flag px-1.5 py-0.5 text-[11px] font-bold text-flag-fg"
          >
            Б
            <span class="sr-only">победа по буллитам</span>
          </span>

          <!-- Нет счёта — прочерк -->
          <span
            class="w-7 shrink-0 text-right text-base font-bold tabular-nums"
            :class="[
              !outcome.played && 'text-muted',
              outcome.played && outcome.winnerId && outcome.winnerId !== side.id && 'text-muted',
            ]"
          >{{ side.score ?? '—' }}</span>
        </li>
      </ul>

      <!--
        Буллиты вторым ярусом. Счёта серии буллитов в API НЕТ (есть только
        bullet_win_team_id), а по правилам лиги матч идёт в таблицу как ничья
        с бонусным очком. Поэтому здесь победитель, а не выдуманные цифры.
      -->
      <p
        v-if="outcome.shootout"
        class="mt-2.5 flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-xs"
      >
        <!--
          Без глагола: «победила» не согласуется с «Сокол» и «Крылья Советов».
          Назывная конструкция подходит любому названию.
        -->
        <span class="shrink-0 font-semibold text-muted">Победа по буллитам</span>
        <span class="min-w-0 truncate font-bold">
          {{ team(outcome.winnerId)?.name ?? `Команда №${outcome.winnerId}` }}
        </span>
      </p>

      <p
        v-else-if="outcome.unresolvedTie"
        class="mt-2.5 rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-muted"
      >
        Ничья · победитель буллитов не указан
      </p>

      <p
        v-else-if="outcome.tied"
        class="mt-2.5 rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-semibold text-muted"
      >
        Ничья
      </p>
    </NuxtLink>

    <!--
      Кнопка статистики у каждого матча. Сосед ссылки на матч, не вложена.

      Ведёт на ?tab=stats, а не на якорь: разделы страницы матча стали
      вкладками, и якоря #protocol больше нет. Подпись тоже сменилась —
      «Протокол» там теперь означает скан бумажного протокола, отдельную
      вкладку, и кнопка обещала бы не то, что открывает.
    -->
    <NuxtLink
      :to="{ path: gamePath(game.id), query: { tab: 'stats' } }"
      class="mt-auto flex min-h-11 items-center justify-center gap-2 border-t border-rule text-sm font-semibold text-accent"
    >
      <AppIcon
        name="file"
        :size="16"
      />
      Статистика
    </NuxtLink>
  </article>
</template>
