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
  'vkvideo.ru': () => null,
  'vk.com': () => null,
}

function embedId(u: URL): string | null {
  return u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null
}

export interface VideoRef {
  kind: 'youtube' | 'rutube' | 'link'
  /** URL для <iframe>, если встраивание поддержано */
  embed: string | null
  href: string
}

/**
 * Разбирает video_url. Встраиваем только по белому списку и только по клику —
 * автозагрузка плеера на wi-fi катка недопустима.
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
  return { kind: 'link', embed: null, href: url }
}

/** Скан протокола: PDF или картинка — от этого зависит способ показа. */
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

export function isPdf(path: string | null | undefined): boolean {
  return !!path && /\.pdf($|\?)/i.test(path)
}
