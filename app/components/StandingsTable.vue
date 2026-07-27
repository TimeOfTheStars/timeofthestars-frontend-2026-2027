<script setup lang="ts">
import type { StandingRow } from '#shared/types/api'

/**
 * Турнирная таблица. Самый плотный экран проекта: 11 полей смысла в 343px.
 *
 * ГЛАВНЫЕ РЕШЕНИЯ (подробности — в плане, раздел 5.1):
 *
 * • Горизонтального скролла НЕТ никогда. Колонок 5 → 8 → 9 → 10
 *   на 375 / 640 / 768 / 1024, переключение ТОЛЬКО CSS-классами:
 *   useMediaQuery на сервере вернул бы фолбэк и дал вспышку не той раскладки
 *   плюс рассинхрон гидрации.
 *
 * • `table-fixed` + ширины на <th> — обязательны, не косметика. Без них
 *   длинное кириллическое название, iOS «Larger Text» или системное
 *   масштабирование на Android распирают таблицу за 375px и уносят
 *   горизонтально всю страницу.
 *
 * • `border-separate border-spacing-0` — WebKit игнорирует position:sticky
 *   на ячейках при border-collapse:collapse, и на iPhone заголовок бы не липнул.
 *   Фон липкой шапки — на каждом <th>: Safari не рисует фон <thead>/<tr>
 *   за ячейками, строки проезжали бы сквозь прозрачную шапку.
 *
 * • Зебра — по индексу v-for, а не через `odd:`. Раскрытая деталь — настоящий
 *   <tr>, и `odd:` инвертировал бы полосы у всех строк ниже.
 *
 * • Тап по строке РАСКРЫВАЕТ; ссылка на команду — внутри раскрытой панели.
 *   Так у тапа одно значение (иначе неизбежны промахи «хотел открыть команду,
 *   а раскрыл детали»), и названию достаётся вся ширина колонки.
 *
 * • Сортировку НЕ трогаем: сервер уже отсортировал (очки → разница →
 *   заброшенные), место = индекс + 1. Своя сортировка разойдётся с админкой.
 *
 * • Линию «зоны плей-офф» не рисуем: количества мест в API нет, любое
 *   число было бы выдумкой.
 */
const props = defineProps<{
  rows: StandingRow[]
  /** id команды, которую подсветить («моя команда») */
  highlightTeamId?: number | null
}>()

const open = ref<Set<number>>(new Set())

function toggle(teamId: number) {
  const next = new Set(open.value)
  if (next.has(teamId)) next.delete(teamId)
  else next.add(teamId)
  open.value = next
}

/** Липкую шапку включаем только когда таблица реально длиннее экрана */
const sticky = computed(() => props.rows.length > 6)

// 12px — объявленный пол кегля; заголовки колонок читает болельщик, значит
// они не «служебная отметка» и мельче быть не могут
const thBase
  = 'border-b border-rule-strong bg-bg py-2 text-xs font-bold uppercase tracking-wide text-muted'
const tdBase = 'border-b border-rule py-2 text-right tabular-nums'
</script>

<template>
  <div v-if="rows.length">
    <table class="table-bleed table-fixed border-separate border-spacing-0 text-[13px]">
      <caption class="sr-only">
        Турнирная таблица. Отсортирована по очкам, затем по разнице мячей и
        заброшенным шайбам. Место команды соответствует её позиции в таблице.
      </caption>

      <thead :class="sticky && 'sticky top-header z-10'">
        <tr>
          <th
            scope="col"
            class="w-10 pr-1 pl-4 text-right"
            :class="thBase"
          >
            <span class="sr-only">Место</span>
            <span aria-hidden="true">#</span>
          </th>

          <th
            scope="col"
            class="pl-2 text-left"
            :class="thBase"
          >
            Команда
          </th>

          <th
            scope="col"
            class="w-8 lg:w-14 text-right"
            :class="thBase"
          >
            <abbr
              title="Игры"
              class="no-underline"
            >И</abbr>
          </th>

          <!-- 375px: победы-ничьи-поражения одной ячейкой «9-1-2» -->
          <th
            scope="col"
            class="w-16 text-right sm:hidden"
            :class="thBase"
          >
            <abbr
              title="Победы, ничьи, поражения"
              class="no-underline"
            >В-Н-П</abbr>
          </th>

          <th
            scope="col"
            class="hidden w-8 text-right sm:table-cell lg:w-14"
            :class="thBase"
          >
            <abbr
              title="Победы"
              class="no-underline"
            >В</abbr>
          </th>
          <th
            scope="col"
            class="hidden w-8 text-right sm:table-cell lg:w-14"
            :class="thBase"
          >
            <abbr
              title="Ничьи"
              class="no-underline"
            >Н</abbr>
          </th>
          <th
            scope="col"
            class="hidden w-8 text-right sm:table-cell lg:w-14"
            :class="thBase"
          >
            <abbr
              title="Поражения"
              class="no-underline"
            >П</abbr>
          </th>

          <!-- Шайбы одной колонкой «34-21»: «З» и «П» рядом дали бы два «П» -->
          <th
            scope="col"
            class="hidden w-20 text-right md:table-cell lg:w-28"
            :class="thBase"
          >
            Шайбы
          </th>

          <th
            scope="col"
            class="hidden w-10 text-right sm:table-cell lg:w-16"
            :class="thBase"
          >
            <abbr
              title="Разница шайб"
              class="no-underline"
            >Р</abbr>
          </th>

          <!-- extra_points УЖЕ входит в points, поэтому колонка только с lg -->
          <th
            scope="col"
            class="hidden w-8 text-right lg:table-cell lg:w-14"
            :class="thBase"
          >
            <abbr
              title="В том числе за победы по буллитам"
              class="no-underline"
            >Б</abbr>
          </th>

          <th
            scope="col"
            class="w-12 pr-4 text-right lg:w-20"
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
        <template
          v-for="(row, i) in rows"
          :key="row.team.id"
        >
          <tr :class="i % 2 === 1 && 'bg-surface-2'">
            <!-- «Моя команда» отмечается полосой слева, а не фоном строки:
                 фон спорил бы с зеброй и ронял контраст приглушённого текста -->
            <td
              class="w-10 pr-1 pl-4 font-bold"
              :class="[
                tdBase,
                row.team.id === highlightTeamId
                  ? 'border-l-[3px] border-l-accent pl-3 text-accent'
                  : '',
              ]"
            >
              {{ i + 1 }}
            </td>

            <!-- Ячейка команды: <th scope="row"> — это заголовок строки -->
            <th
              scope="row"
              class="border-b border-rule py-1.5 pl-2 text-left font-normal"
            >
              <!-- до lg — кнопка-раскрытие -->
              <button
                type="button"
                class="flex min-h-12 w-full items-center gap-2 text-left lg:hidden"
                :aria-expanded="open.has(row.team.id)"
                :aria-controls="`standings-detail-${row.team.id}`"
                @click="toggle(row.team.id)"
              >
                <TeamCrest
                  :team="row.team"
                  :size="28"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ row.team.name }}</span>
                </span>
                <AppIcon
                  :name="open.has(row.team.id) ? 'chevronUp' : 'chevronDown'"
                  :size="16"
                  class="text-muted"
                />
              </button>

              <!-- с lg все данные уже в колонках, раскрывать нечего → ссылка.
                   Оба варианта в DOM, переключаются CSS — без JS-брейкпоинтов. -->
              <NuxtLink
                :to="teamPath(row.team)"
                class="hidden min-h-11 items-center gap-2 lg:flex"
              >
                <TeamCrest
                  :team="row.team"
                  :size="28"
                />
                <span class="min-w-0">
                  <span class="block truncate font-semibold">{{ row.team.name }}</span>
                  <span
                    v-if="row.team.city"
                    class="block truncate text-xs text-muted"
                  >{{ row.team.city }}</span>
                </span>
              </NuxtLink>
            </th>

            <td :class="[tdBase, 'w-8 lg:w-14']">
              {{ row.games }}
            </td>

            <td :class="[tdBase, 'w-16 sm:hidden']">
              {{ row.wins }}-{{ row.draws }}-{{ row.losses }}
            </td>

            <td :class="[tdBase, 'hidden w-8 sm:table-cell lg:w-14']">
              {{ row.wins }}
            </td>
            <td :class="[tdBase, 'hidden w-8 sm:table-cell lg:w-14']">
              {{ row.draws }}
            </td>
            <td :class="[tdBase, 'hidden w-8 sm:table-cell lg:w-14']">
              {{ row.losses }}
            </td>

            <td :class="[tdBase, 'hidden w-20 md:table-cell lg:w-28']">
              {{ row.goals_scored }}-{{ row.goals_conceded }}
            </td>

            <td :class="[tdBase, 'hidden w-10 sm:table-cell lg:w-16']">
              {{ goalDiff(row.goals_scored, row.goals_conceded) }}
            </td>

            <td :class="[tdBase, 'hidden w-8 text-muted lg:table-cell lg:w-14']">
              {{ row.extra_points }}
            </td>

            <td
              class="w-12 pr-4 text-[15px] font-bold lg:w-20"
              :class="tdBase"
            >
              {{ row.points }}
            </td>
          </tr>

          <!-- Деталь: только до lg, где часть колонок скрыта -->
          <tr
            v-if="open.has(row.team.id)"
            :id="`standings-detail-${row.team.id}`"
            class="lg:hidden"
            :class="i % 2 === 1 && 'bg-surface-2'"
          >
            <!-- colspan по ПОЛНОМУ числу колонок в DOM (11): видимых колонок
                 5/8/9 на разных брейкпоинтах, а colspan адаптивным не бывает.
                 Скрытые через display:none ячейки имеют нулевую ширину, поэтому
                 ячейка честно растягивается на всю строку в любом случае. -->
            <td
              colspan="11"
              class="border-b border-rule px-4 pt-1 pb-4"
            >
              <!-- Полное название обязательно здесь: усечённое имя в строке
                   не должно быть тупиком -->
              <p class="mb-3 text-sm font-bold">
                {{ row.team.name }}
                <span
                  v-if="row.team.city"
                  class="font-normal text-muted"
                >· {{ row.team.city }}</span>
              </p>

              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3">
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Победы
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.wins }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Ничьи
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.draws }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Поражения
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.losses }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Заброшено
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.goals_scored }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Пропущено
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.goals_conceded }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">
                    Разница
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ goalDiff(row.goals_scored, row.goals_conceded) }}
                  </dd>
                </div>
                <div class="col-span-2 flex justify-between gap-2 sm:col-span-3">
                  <dt class="text-muted">
                    В том числе по буллитам
                  </dt>
                  <dd class="font-semibold tabular-nums">
                    {{ row.extra_points }}
                  </dd>
                </div>
              </dl>

              <NuxtLink
                :to="teamPath(row.team)"
                class="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent"
              >
                Страница команды
                <AppIcon
                  name="chevronRight"
                  :size="16"
                />
              </NuxtLink>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <p class="mt-3 px-1 text-xs text-muted">
      Победа — 2 очка, ничья — 1. За победу по буллитам добавляется ещё 1 очко:
      победитель получает 2, проигравший 1. В таблицу идут только матчи
      регулярного сезона с внесённым счётом.
    </p>
  </div>

  <!-- Подводный камень №5: строки создаются только для заявленных команд,
       поэтому таблица бывает пустой при уже сыгранных матчах -->
  <EmptyState
    v-else
    icon="trophy"
    title="Таблица появится, когда команды будут заявлены"
    hint="Строки создаются только для команд, добавленных в состав соревнования. Матчи при этом уже могут быть сыграны."
  />
</template>
