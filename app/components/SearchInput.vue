<script setup lang="ts">
/**
 * Поиск, синхронизированный с query-параметром.
 *
 * Обёрнут в <form>: без JS отправка формы всё равно приведёт на страницу
 * с нужным ?q=. С JS — обновляем URL с задержкой, чтобы не дёргать API
 * на каждую букву.
 */
const props = withDefaults(
  defineProps<{ param?: string; placeholder?: string; label: string }>(),
  { param: 'q', placeholder: 'Поиск' },
)

const route = useRoute()
const router = useRouter()

const value = ref(String(route.query[props.param] ?? ''))
let timer: ReturnType<typeof setTimeout> | undefined

// Внешние изменения URL (назад/вперёд) должны попадать в поле
watch(
  () => route.query[props.param],
  (q) => {
    const next = String(q ?? '')
    if (next !== value.value) value.value = next
  },
)

function push(q: string) {
  const query = { ...route.query }
  if (q) query[props.param] = q
  else delete query[props.param]
  delete query.page
  router.replace({ path: route.path, query })
}

function onInput() {
  clearTimeout(timer)
  timer = setTimeout(() => push(value.value.trim()), 350)
}

function onSubmit() {
  clearTimeout(timer)
  push(value.value.trim())
}

function clear() {
  value.value = ''
  onSubmit()
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <form
    role="search"
    class="relative"
    @submit.prevent="onSubmit"
  >
    <label
      :for="`search-${param}`"
      class="sr-only"
    >{{ label }}</label>

    <AppIcon
      name="search"
      :size="18"
      class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
    />

    <input
      :id="`search-${param}`"
      v-model="value"
      type="search"
      :name="param"
      :placeholder="placeholder"
      autocomplete="off"
      class="min-h-12 w-full rounded-xl border border-rule bg-surface pr-11 pl-10 text-[15px] placeholder:text-muted"
      @input="onInput"
    >

    <button
      v-if="value"
      type="button"
      class="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted"
      aria-label="Очистить поиск"
      @click="clear"
    >
      <AppIcon
        name="close"
        :size="18"
      />
    </button>
  </form>
</template>
