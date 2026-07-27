<script setup lang="ts">
import type { ProtocolSide } from '~/utils/protocol'

/**
 * Протокол одной стороны: основная таблица + вратарская.
 *
 * Основная таблица содержит ВСЕ строки, включая вратарские (с бейджем «В»):
 * у вратаря бывают свои голы, передачи и штрафы, и если унести его в отдельную
 * таблицу целиком, они исчезнут со страницы.
 */
const props = defineProps<{
  side: ProtocolSide
  anchor: string
  /** номера на майках: player_id → number. Приезжают отложенно. */
  numbers: Map<number, number | null>
}>()

const { team } = useTeamDirectory()

const thBase
  = 'border-b border-rule-strong py-2 text-xs font-bold uppercase tracking-wide text-muted'
const tdBase = 'border-b border-rule py-2 text-right tabular-nums'

const hasGoalies = computed(() => props.side.goalies.length > 0)
</script>

<template>
  <section
    :id="anchor"
    tabindex="-1"
    class="scroll-mt-28"
  >
    <h3 class="mb-2 flex items-center gap-2">
      <TeamName
        :team="team(side.teamId)"
        :team-id="side.teamId"
        :size="30"
      />
    </h3>

    <template v-if="side.lines.length">
      <table class="table-bleed table-fixed border-separate border-spacing-0 text-[13px]">
        <caption class="sr-only">
          Протокол команды «{{ team(side.teamId)?.name ?? side.teamId }}»
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="pl-4 text-left"
              :class="thBase"
            >
              Игрок
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
              class="w-9 text-right"
              :class="thBase"
            >
              <abbr
                title="Очки"
                class="no-underline"
              >О</abbr>
            </th>
            <th
              scope="col"
              class="w-12 pr-4 text-right"
              :class="thBase"
            >
              <abbr
                title="Штрафные минуты"
                class="no-underline"
              >Штр</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(line, i) in side.lines"
            :key="lineKey(line, i)"
            :class="i % 2 === 1 && 'bg-surface-2'"
          >
            <th
              scope="row"
              class="border-b border-rule py-1.5 pl-4 text-left font-normal"
            >
              <component
                :is="line.player ? 'NuxtLink' : 'span'"
                :to="line.player ? playerPath(line.player) : undefined"
                class="flex min-h-11 items-center gap-1.5"
              >
                <!-- Слот номера ЗАРЕЗЕРВИРОВАН заранее: номера приезжают
                     отложенным запросом, и без резерва их приход сдвигал бы
                     раскладку. -->
                <span
                  class="w-6 shrink-0 text-right text-xs font-bold text-muted tabular-nums"
                  aria-hidden="true"
                >{{ numbers.get(line.player_id) ?? '' }}</span>

                <span
                  class="min-w-0 flex-1 truncate"
                  :class="lineName(line).unnamed ? 'italic text-muted' : 'font-semibold'"
                >{{ lineName(line).text }}</span>
                <span
                  v-if="lineName(line).unnamed"
                  class="sr-only"
                >Имя игрока отсутствует в данных</span>

                <AppChip
                  v-if="line.is_goalie"
                  size="sm"
                  variant="neutral"
                  title="Вратарь"
                >
                  В
                </AppChip>
              </component>
            </th>

            <td :class="[tdBase, 'w-8']">
              {{ line.goals }}
            </td>
            <td :class="[tdBase, 'w-8']">
              {{ line.assists }}
            </td>
            <td :class="[tdBase, 'w-9 font-bold']">
              {{ line.goals + line.assists }}
            </td>
            <td :class="[tdBase, 'w-12 pr-4']">
              {{ line.penalties }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Вратарская таблица: только вратарские колонки, ДОПОЛНЯЕТ основную -->
      <div
        v-if="hasGoalies"
        class="mt-5"
      >
        <h4 class="mb-1.5 text-xs font-bold text-muted uppercase">
          Вратари
        </h4>
        <table class="table-bleed table-fixed border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th
                scope="col"
                class="pl-4 text-left"
                :class="thBase"
              >
                Игрок
              </th>
              <th
                scope="col"
                class="w-12 text-right"
                :class="thBase"
              >
                <abbr
                  title="Минуты на площадке"
                  class="no-underline"
                >Мин</abbr>
              </th>
              <th
                scope="col"
                class="w-14 text-right"
                :class="thBase"
              >
                Сэйвы
              </th>
              <th
                scope="col"
                class="w-11 pr-4 text-right"
                :class="thBase"
              >
                <abbr
                  title="Пропущенные шайбы"
                  class="no-underline"
                >ПШ</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(line, i) in side.goalies"
              :key="lineKey(line, i)"
              :class="i % 2 === 1 && 'bg-surface-2'"
            >
              <th
                scope="row"
                class="border-b border-rule py-2 pl-4 text-left font-normal"
              >
                <span
                  class="block truncate"
                  :class="lineName(line).unnamed ? 'italic text-muted' : 'font-semibold'"
                >{{ lineName(line).text }}</span>
              </th>
              <!--
                Спека обещает, что вратарские поля непусты ТОЛЬКО КОГДА
                is_goalie === true, но не обещает, что они заполнены КОГДА он
                true. Поэтому каждое поле проверяется отдельно: `?? 0` здесь
                выдумал бы «сухарь».
              -->
              <td :class="[tdBase, 'w-12']">
                {{ orDash(line.minutes_played) }}
              </td>
              <td :class="[tdBase, 'w-14']">
                {{ orDash(line.saves) }}
              </td>
              <td :class="[tdBase, 'w-11 pr-4']">
                {{ orDash(line.goals_against) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Протокол бывает заполнен только по одной стороне -->
    <EmptyState
      v-else
      icon="file"
      title="Протокол по этой команде не заполнен"
    />
  </section>
</template>
