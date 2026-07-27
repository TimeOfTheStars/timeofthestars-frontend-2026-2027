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
export function isPdf(path: string | null | undefined): boolean {
  return !!path && /\.pdf($|\?)/i.test(path)
}
