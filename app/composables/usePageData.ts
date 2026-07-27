import type { $Fetch } from 'ofetch'
import type { WatchSource } from 'vue'

/**
 * Правило на проект: ОДИН useAsyncData на страницу, все её запросы внутри
 * него в Promise.all. Один payload, одно состояние загрузки, ноль водопадов.
 *
 * Справочник команд подмешивается сюда же и грузится параллельно с данными
 * страницы — см. useTeamDirectory о том, почему его нельзя ставить в лейаут.
 */
export async function usePageData<T>(
  key: string | (() => string),
  handler: ($api: $Fetch) => Promise<T>,
  options?: { watch?: WatchSource[] },
) {
  const { $api } = useNuxtApp()

  const state = useAsyncData<T>(
    key as string,
    async () => {
      const [, data] = await Promise.all([
        ensureTeamDirectory($api as $Fetch),
        handler($api as $Fetch),
      ])
      return data
    },
    options,
  )

  // Дожидаемся разрешения ДО проверки: без этого error.value ещё null,
  // и условие ниже никогда не срабатывало (проверено — отдавался 200).
  await state

  /**
   * Если на СЕРВЕРЕ запрос упал и показывать нечего — поднимаем 503 и отдаём
   * error.vue.
   *
   * Дело не в виде страницы, а в СТАТУСЕ: «успешный» ответ с ошибкой внутри
   * попал бы в SWR-кеш на 60–300 секунд, и пользователи продолжали бы видеть
   * ошибку уже после того, как API поднялся. Плюс поисковики
   * проиндексировали бы страницу ошибки как нормальный контент.
   */
  if (import.meta.server && state.error.value && !state.data.value) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Сервер лиги не отвечает',
      fatal: true,
    })
  }

  return state
}
