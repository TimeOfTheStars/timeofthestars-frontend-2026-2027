<script setup lang="ts">
import type { Player, Team } from '#shared/types/api'

/**
 * Песочница примитивов в САМЫХ ХУДШИХ реальных данных.
 * Проверка: ни один блок не должен выглядеть сломанным.
 *
 * В проде страница отдаёт 404. Сделано рантайм-проверкой, а не `ignore`
 * в nuxt.config: тот обрабатывается раньше слияния env-оверрайдов и внутри
 * `$production` просто не срабатывает — страница попадала в .output.
 * Здесь же гарантия однозначная, а неиспользуемый ленивый чанк весит байты.
 */
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Страница не найдена', fatal: true })
}

definePageMeta({ layout: 'default' })
useHead({ title: 'Песочница', meta: [{ name: 'robots', content: 'noindex' }] })

const teamNoLogo: Team = { id: 1, name: 'Сокол', slug: 'sokol', city: 'Москва', logo_url: null }
const teamNoCity: Team = { id: 2, name: 'Молния', slug: 'molniya', city: null, logo_url: null }
const teamLongName: Team = {
  id: 5,
  name: 'Академия хоккея имени Всеволода Боброва',
  slug: 'akademiya',
  city: 'Московская область, Красногорск',
  logo_url: null,
}
const teamOneWord: Team = { id: 7, name: 'ЦСКА', slug: 'cska', city: null, logo_url: null }

const playerBare: Player = {
  id: 7, full_name: 'Иван Петров',
  birth_date: null, position: null, grip: null, photo_url: null,
}
const playerLong: Player = {
  id: 8, full_name: 'Константинопольский Вячеслав Апполинарьевич',
  birth_date: '2000-05-01', position: 'вратарь', grip: 'левый', photo_url: null,
}

const allSlots = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  name: ['Сокол', 'Молния', 'Барс', 'Комета', 'Вихрь', 'Торнадо', 'Атлант', 'Витязь', 'Легион'][i]!,
}))

const pending = ref(false)
</script>

<template>
  <div class="container-page py-6">
    <h1 class="mb-1 text-2xl font-extrabold">
      Песочница примитивов
    </h1>
    <p class="mb-8 text-sm text-muted">
      Все блоки — в худших реальных данных: нет логотипов, нет фото, нет города,
      длинные кириллические названия.
    </p>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Гербы команд без логотипа
      </h2>
      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-rule bg-surface p-4">
        <div
          v-for="s in [24, 28, 36, 48, 64, 96]"
          :key="s"
          class="text-center"
        >
          <TeamCrest
            :team="teamNoLogo"
            :size="s"
          />
          <p class="mt-1.5 text-[11px] text-muted">
            {{ s }}px
          </p>
        </div>
        <div class="text-center">
          <TeamCrest
            :team="teamOneWord"
            :size="48"
          />
          <p class="mt-1.5 text-[11px] text-muted">
            одно слово
          </p>
        </div>
        <div class="text-center">
          <TeamCrest
            :team="teamLongName"
            :size="48"
          />
          <p class="mt-1.5 text-[11px] text-muted">
            длинное
          </p>
        </div>
      </div>
      <p class="mt-2 text-xs text-muted">
        Различает монограмма, не цвет: 9 слотов на десятки команд — коллизии
        неизбежны, поэтому цвет вторичен.
      </p>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Все 9 слотов цвета
      </h2>
      <div class="flex flex-wrap gap-2 rounded-xl border border-rule bg-surface p-4">
        <div
          v-for="t in allSlots"
          :key="t.id"
          class="flex items-center gap-2 rounded-lg bg-surface-2 p-2"
        >
          <TeamCrest
            :team="{ id: t.id, name: t.name, slug: '', city: null, logo_url: null }"
            :size="32"
          />
          <span class="text-xs font-semibold">{{ t.name }}</span>
        </div>
      </div>
      <p class="mt-2 text-xs text-muted">
        Светлота и хрома зафиксированы (oklch L=0.45 C=0.115) — белый текст
        на любом слоте даёт ≥ 6.69:1.
      </p>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Названия команд (обрезка в узкой колонке)
      </h2>
      <div class="max-w-[191px] space-y-2 rounded-xl border border-rule bg-surface p-4">
        <p class="mb-2 text-[11px] text-muted">
          191px — ширина колонки «Команда» на 375px
        </p>
        <TeamName
          :team="teamNoLogo"
          :link="false"
          show-city
        />
        <TeamName
          :team="teamNoCity"
          :link="false"
          show-city
        />
        <TeamName
          :team="teamLongName"
          :link="false"
          show-city
        />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Аватары игроков
      </h2>
      <div class="flex flex-wrap items-end gap-4 rounded-xl border border-rule bg-surface p-4">
        <PlayerAvatar
          :player="playerBare"
          :size="32"
        />
        <PlayerAvatar
          :player="playerBare"
          :size="40"
        />
        <PlayerAvatar
          :player="playerLong"
          :size="56"
        />
        <PlayerAvatar
          :player="null"
          :size="56"
        />
        <span class="text-xs text-muted">последний — player: null</span>
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Чипы
      </h2>
      <div class="flex flex-wrap gap-2 rounded-xl border border-rule bg-surface p-4">
        <AppChip>Запланирован</AppChip>
        <AppChip variant="accent">
          Завершён
        </AppChip>
        <AppChip variant="flag">
          Победа по буллитам
        </AppChip>
        <AppChip variant="outline">
          Регулярка
        </AppChip>
        <AppChip
          variant="accent"
          icon="star"
        >
          Победитель
        </AppChip>
        <AppChip size="sm">
          К
        </AppChip>
        <AppChip
          size="sm"
          variant="flag"
        >
          В
        </AppChip>
      </div>
      <p class="mt-2 text-xs text-muted">
        Заливка и цвет текста — парные токены, меняются вместе с темой.
        Красная плашка с тёмным текстом невозможна по построению.
      </p>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Пустые состояния
      </h2>
      <div class="space-y-4">
        <EmptyState
          title="Таблица появится, когда команды будут заявлены"
          hint="Матчи уже есть, но строки в таблице создаются только для команд, добавленных в состав соревнования."
          icon="trophy"
        />
        <EmptyState
          title="Протокол матча не опубликован"
          hint="Счёт внесён, а состав по игрокам — ещё нет."
          icon="file"
        />
        <EmptyState
          title="Матчей плей-офф пока нет"
          icon="calendar"
        />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Загрузка и обрыв связи
      </h2>
      <StaleNotice
        :pending="pending"
        @refresh="pending = !pending"
      />
      <div class="rounded-xl border border-rule bg-surface p-4">
        <AppSkeleton
          :rows="4"
          :height="20"
        />
      </div>
      <div class="mt-4">
        <RefreshButton
          :pending="pending"
          @refresh="pending = !pending"
        />
      </div>
    </section>

    <section class="mb-10">
      <h2 class="mb-3 text-lg font-bold">
        Форматтеры
      </h2>
      <dl class="grid gap-2 rounded-xl border border-rule bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted">
            statNum(0, games=0) — не играл
          </dt>
          <dd class="font-semibold">
            {{ statNum(0, 0) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            statNum(0, games=5) — играл, не забил
          </dt>
          <dd class="font-semibold">
            {{ statNum(0, 5) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            orDash(null) — вратарское поле пусто
          </dt>
          <dd class="font-semibold">
            {{ orDash(null) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            goalDiff(34, 21)
          </dt>
          <dd class="font-semibold">
            {{ goalDiff(34, 21) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            ruDateRange без end_date
          </dt>
          <dd class="font-semibold">
            {{ ruDateRange('2026-01-10', null) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            ruDateRange с end_date
          </dt>
          <dd class="font-semibold">
            {{ ruDateRange('2026-01-10', '2026-05-30') }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            ruTime('19:30:00')
          </dt>
          <dd class="font-semibold">
            {{ ruTime('19:30:00') }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            ruTime(null) — время не указано
          </dt>
          <dd class="font-semibold">
            {{ ruTime(null) ?? 'время уточняется' }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            plural: 1 / 3 / 5 матчей
          </dt>
          <dd class="font-semibold">
            {{ pluralWith(1, ['матч', 'матча', 'матчей']) }} ·
            {{ pluralWith(3, ['матч', 'матча', 'матчей']) }} ·
            {{ pluralWith(5, ['матч', 'матча', 'матчей']) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            позиция одной буквой
          </dt>
          <dd class="font-semibold">
            вратарь → {{ positionShort('вратарь') }} ·
            защитник → {{ positionShort('защитник') }} ·
            нападающий → {{ positionShort('нападающий') }}
          </dd>
        </div>
      </dl>
    </section>

    <section>
      <h2 class="mb-3 text-lg font-bold">
        Табличные цифры
      </h2>
      <table class="w-full max-w-xs border-separate border-spacing-0 text-sm">
        <tbody>
          <tr
            v-for="row in [[1, 1, 1], [8, 88, 888], [10, 101, 1010], [0, 0, 0]]"
            :key="String(row)"
          >
            <td
              v-for="(n, i) in row"
              :key="i"
              class="border-b border-rule py-1.5 text-right font-semibold"
            >
              {{ n }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-xs text-muted">
        Цифры обязаны стоять ровно в колонку — Golos Text + tabular-nums.
      </p>
    </section>
  </div>
</template>
