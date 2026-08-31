<script setup lang="ts">
/**
 * Подписка на ленту матчей из Apple Календаря и Google Календаря.
 *
 * Именно подписка, а не разовый импорт: у половины матчей время ещё не
 * проставлено, а у сыгранных появляется счёт. Импортированный файл устарел бы
 * в тот же день, подписка подтянет правки сама.
 *
 * Apple открывает webcal:// напрямую. Google своей схемы не понимает и ждёт
 * адрес параметром cid — причём тоже webcal, иначе предлагает разовый импорт
 * вместо подписки.
 *
 * Фильтры страницы попадают в адрес ленты: можно подписаться на один турнир,
 * а не на всю лигу.
 */
const props = defineProps<{
  /** ?competition= и ?type= со страницы; остальные фильтры в подписке смысла не имеют */
  competition: number | null
  type: string | null
}>()

const { siteUrl } = useRuntimeConfig().public

const feed = computed(() => {
  const params = new URLSearchParams()
  if (props.competition != null) params.set('competition', String(props.competition))
  if (props.type) params.set('type', props.type)
  const qs = params.toString()
  const base = String(siteUrl).replace(/\/$/, '')
  return `${base}/calendar.ics${qs ? `?${qs}` : ''}`
})

const webcal = computed(() => feed.value.replace(/^https?:/, 'webcal:'))
const google = computed(
  () => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal.value)}`,
)
</script>

<template>
  <section class="rounded-xl border border-rule bg-surface p-4">
    <h3 class="text-sm font-bold">
      Подписаться на календарь
    </h3>
    <p class="mt-1 text-xs text-muted">
      Матчи появятся в вашем календаре и будут обновляться сами: время уточнят —
      сдвинется, матч сыграют — добавится счёт.
    </p>

    <div class="mt-3 flex flex-wrap gap-2">
      <a
        :href="webcal"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
      >
        <AppIcon
          name="calendar"
          :size="16"
        />
        Apple Календарь
      </a>

      <a
        :href="google"
        target="_blank"
        rel="noopener"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
      >
        <AppIcon
          name="calendar"
          :size="16"
        />
        Google Календарь
        <AppIcon
          name="external"
          :size="14"
          class="text-muted"
        />
      </a>

      <!-- Прямая ссылка: для всего остального, от Outlook до почтового клиента -->
      <a
        :href="feed"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule px-3.5 text-sm font-semibold text-muted transition-colors hover:text-fg"
      >
        Ссылка на ленту
      </a>
    </div>
  </section>
</template>
