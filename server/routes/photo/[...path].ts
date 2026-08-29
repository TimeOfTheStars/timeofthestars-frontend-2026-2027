/**
 * Прокси фотографий игроков с домена API на свой.
 *
 * Нужен ровно для одного: страница состава уменьшает фото через canvas,
 * чтобы собранный PDF весил сотню килобайт, а не мегабайт. На /media у API
 * НЕТ заголовков CORS, поэтому холст с таким изображением становится
 * «испорченным», и toDataURL бросает SecurityError. Через свой домен
 * ограничение не действует.
 *
 * Отдаём как есть, без пережатия: своей обработки картинок в проекте нет, а
 * тянуть её на сервер с 2 ГБ ради этого незачем — уменьшает браузер.
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, message: 'Не указан файл' })

  // Только имя файла из /media: параметр не должен уводить запрос на
  // произвольный адрес.
  if (!/^[\w.-]+$/.test(path)) {
    throw createError({ statusCode: 400, message: 'Недопустимое имя файла' })
  }

  const { apiBase } = useRuntimeConfig(event).public
  const upstream = await fetch(`${apiBase}/media/${path}`)

  if (!upstream.ok) {
    throw createError({ statusCode: upstream.status, message: 'Файл не найден' })
  }

  setHeader(event, 'content-type', upstream.headers.get('content-type') ?? 'image/webp')
  // Имя файла содержит хеш содержимого, поэтому кешируем навсегда
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  // Uint8Array, а не Buffer: типов node в проекте нет, а Nitro одинаково
  // отдаёт и то и другое.
  return new Uint8Array(await upstream.arrayBuffer())
})
