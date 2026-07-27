import type { ApiError } from '#shared/types/api'
import { assertNoTrailingSlashes } from '#shared/utils/endpoints'

/**
 * Единственный экземпляр $fetch с baseURL. Работает и на сервере, и на клиенте.
 * Ошибки приводятся к человекочитаемому виду с учётом того, что `detail` —
 * строка на 404 и массив объектов на 422 (API_FRONTEND.md, раздел 2).
 */
export default defineNuxtPlugin(() => {
  const { apiBase } = useRuntimeConfig().public

  if (import.meta.dev) assertNoTrailingSlashes()

  const api = $fetch.create({
    baseURL: apiBase,

    onResponseError({ response }) {
      const detail = (response._data as ApiError | undefined)?.detail

      const message
        = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(d => d.msg).filter(Boolean).join('; ')
            : response.status === 404
              ? 'Страница не найдена'
              : 'Не удалось загрузить данные'

      throw createError({
        statusCode: response.status,
        statusMessage: message,
        // 404 — настоящая «страницы нет», её должен показать error.vue
        fatal: response.status === 404,
      })
    },
  })

  return { provide: { api } }
})
