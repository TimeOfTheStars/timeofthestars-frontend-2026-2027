<script setup lang="ts">
/**
 * Лист фильтров. Первая и пока единственная модалка в проекте.
 *
 * Сделан на нативном <dialog> + showModal(): ловушку фокуса, закрытие по Esc,
 * подложку и вырывание из потока браузер даёт сам. Своя реализация всего
 * этого — это сотня строк, которые нечем проверить.
 *
 * Состояние фильтров живёт НЕ здесь, а в адресе страницы. В проекте записано
 * правило: разделы и фильтры делаются ссылками, потому что «шарятся в
 * мессенджер, индексируются, работают без JS и корректно ведут себя по
 * „назад“». Модалка его не отменяет — она лишь способ собрать выбор, а
 * применяется он сменой query. Поэтому ссылка на отфильтрованный календарь
 * остаётся рабочей.
 *
 * Черновик правок держится в draft и уезжает наружу только по «Применить»:
 * иначе каждый тычок по радиокнопке дёргал бы навигацию и перезагружал список.
 */
export interface FilterGroup {
  key: string
  label: string
  options: { value: string; label: string }[]
}

const props = defineProps<{
  groups: FilterGroup[]
  /** текущее значение по каждой группе; пустая строка — «все» */
  modelValue: Record<string, string>
  activeCount: number
}>()

const emit = defineEmits<{
  apply: [Record<string, string>]
  reset: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const draft = ref<Record<string, string>>({ ...props.modelValue })

function open() {
  // Черновик всегда начинается с того, что реально применено: иначе после
  // отмены в нём остались бы прошлые несохранённые тычки.
  draft.value = { ...props.modelValue }
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function apply() {
  emit('apply', { ...draft.value })
  close()
}

function reset() {
  emit('reset')
  close()
}
</script>

<template>
  <div>
    <button
      type="button"
      class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule bg-surface px-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
      @click="open"
    >
      <AppIcon
        name="menu"
        :size="16"
      />
      Фильтры
      <span
        v-if="activeCount"
        class="rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-fg tabular-nums"
      >{{ activeCount }}</span>
    </button>

    <!--
      Позиционирование задаём сами: у dialog по умолчанию margin:auto, и на
      телефоне он повис бы по центру экрана. Ниже sm это лист снизу, с sm —
      обычное окно по центру.
    -->
    <dialog
      ref="dialog"
      class="w-full max-w-lg rounded-t-2xl border border-rule bg-surface p-0 text-fg backdrop:bg-black/50 sm:rounded-2xl"
      style="margin: auto auto 0; max-height: 85dvh"
      aria-label="Фильтры матчей"
      @click.self="close"
    >
      <div class="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
        <h2 class="text-base font-bold">
          Фильтры
        </h2>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:text-fg"
          aria-label="Закрыть"
          @click="close"
        >
          <AppIcon
            name="close"
            :size="18"
          />
        </button>
      </div>

      <div class="max-h-[55dvh] overflow-y-auto px-4 py-3">
        <fieldset
          v-for="group in groups"
          :key="group.key"
          class="mb-4 last:mb-0"
        >
          <legend class="mb-2 text-xs font-bold tracking-wide text-muted uppercase">
            {{ group.label }}
          </legend>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="opt in group.options"
              :key="opt.value"
              class="cursor-pointer"
            >
              <input
                v-model="draft[group.key]"
                type="radio"
                :name="group.key"
                :value="opt.value"
                class="peer sr-only"
              >
              <span
                class="inline-flex min-h-11 items-center rounded-lg border border-rule px-3.5 text-sm font-semibold transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
              >{{ opt.label }}</span>
            </label>
          </div>
        </fieldset>
      </div>

      <div class="flex gap-2 border-t border-rule px-4 py-3">
        <button
          type="button"
          class="min-h-12 flex-1 rounded-lg border border-rule text-sm font-semibold transition-colors hover:border-rule-strong"
          @click="reset"
        >
          Сбросить
        </button>
        <button
          type="button"
          class="min-h-12 flex-1 rounded-lg bg-accent text-sm font-bold text-accent-fg"
          @click="apply"
        >
          Применить
        </button>
      </div>
    </dialog>
  </div>
</template>
