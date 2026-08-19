/**
 * Все ссылки на файлы в API относительные (`/media/ab12….webp`) —
 * их обязательно склеивать с базовым URL API (подводный камень №3).
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // video_url — внешняя ссылка, её трогать нельзя
  if (/^(https?:)?\/\//i.test(path)) return path

  const { apiBase } = useRuntimeConfig().public
  return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Хосты, с которых разрешено встраивать видео. Всё прочее — обычная ссылка. */
const VIDEO_HOSTS: Record<string, (u: URL) => string | null> = {
  'youtu.be': u => u.pathname.slice(1) || null,
  'www.youtube.com': u => u.searchParams.get('v') ?? embedId(u),
  'youtube.com': u => u.searchParams.get('v') ?? embedId(u),
  'm.youtube.com': u => u.searchParams.get('v'),
  'rutube.ru': u => u.pathname.match(/\/video\/([\w-]+)/)?.[1] ?? null,
  // У VK идентификатор составной: владелец и видео. Возвращаем «oid_id»,
  // а на пару разбираем уже при сборке ссылки на плеер.
  'vkvideo.ru': vkId,
  'vk.ru': vkId,
  'vk.com': vkId,
  'm.vk.com': vkId,
}

function embedId(u: URL): string | null {
  return u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null
}

/**
 * Идентификатор видео VK как «oid_id», где oid у сообществ отрицательный.
 *
 * Встречается тремя способами: в пути (`/video-1_2`), у трансляций с иным
 * префиксом (`/live-1_2`, `/clip-1_2`) и параметром `?z=video-1_2`.
 * Боевая ссылка лиги — как раз `live-`, поэтому префикс обязан быть шире,
 * чем просто `video`.
 */
const VK_ID = /(?:video|live|clip)(-?\d+)_(\d+)/

function vkId(u: URL): string | null {
  const m = VK_ID.exec(u.pathname) ?? VK_ID.exec(u.searchParams.get('z') ?? '')
  return m ? `${m[1]}_${m[2]}` : null
}

export interface VideoRef {
  kind: 'youtube' | 'rutube' | 'vk' | 'link'
  /** URL для <iframe>, если встраивание поддержано */
  embed: string | null
  href: string
}

/**
 * Разбирает video_url. Встраиваем только по белому списку и только когда
 * пользователь сам попросил: плеер монтируется на своей вкладке, а не грузится
 * вместе со страницей — автозагрузка на wi-fi катка недопустима.
 * По той же причине в ссылку на плеер не добавляется autoplay.
 */
export function parseVideo(url: string | null | undefined): VideoRef | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url)
  }
  catch {
    return null
  }

  const id = VIDEO_HOSTS[u.hostname]?.(u) ?? null

  if (id && u.hostname.includes('youtu')) {
    return { kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${id}`, href: url }
  }
  if (id && u.hostname.includes('rutube')) {
    return { kind: 'rutube', embed: `https://rutube.ru/play/embed/${id}`, href: url }
  }
  if (id && u.hostname.includes('vk')) {
    const [oid, videoId] = id.split('_')
    return {
      kind: 'vk',
      embed: `https://vk.ru/video_ext.php?oid=${oid}&id=${videoId}`,
      href: url,
    }
  }
  return { kind: 'link', embed: null, href: url }
}

/**
 * Ссылка на момент в записи матча.
 *
 * Бэкенд хранит только смещение в секундах, а видео у матча одно —
 * `Game.video_url`. Формат `?t=45m5s` понимают и VK, и YouTube, и RuTube.
 *
 * Возвращает null, если пусто любое из двух: сейчас `video_seconds` не
 * проставлен ни у одного гола, хотя видео у матчей уже привязано, — то есть
 * null это штатное состояние, а не сбой.
 */
export function videoAt(videoUrl: string | null | undefined, seconds: number | null | undefined): string | null {
  if (!videoUrl || seconds == null) return null

  const total = Math.max(0, Math.trunc(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const t = `${h ? `${h}h` : ''}${m ? `${m}m` : ''}${s}s`

  return `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}t=${t}`
}

/** Скан протокола: PDF или картинка — от этого зависит способ показа. */
export function isPdf(path: string | null | undefined): boolean {
  return !!path && /\.pdf($|\?)/i.test(path)
}
