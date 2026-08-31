import type { Competition, Game, Page, Team } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Лента матчей в формате iCalendar — для подписки из Apple Календаря и
 * Google Календаря.
 *
 * Именно ПОДПИСКА, а не разовый файл: у половины матчей время ещё не
 * проставлено, а у сыгранных появляется счёт. Разовый импорт устарел бы в тот
 * же день, подписка подтянет правки сама.
 *
 * Поддерживает те же фильтры, что страница матчей (?competition=, ?type=),
 * поэтому можно подписаться на один турнир, а не на всю лигу.
 */

/** Экранирование по RFC 5545: обратный слэш, точка с запятой, запятая, перевод строки. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Складывание длинных строк. Предел в 75 ОКТЕТОВ, а не символов: кириллица в
 * UTF-8 занимает два байта, и складывание по символам порвало бы строку
 * посреди буквы.
 */
function fold(line: string): string {
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const bytes = enc.encode(line)
  if (bytes.length <= 75) return line

  const parts: string[] = []
  let start = 0
  while (start < bytes.length) {
    // Первая строка 75 октетов, продолжения 74: один октет забирает пробел
    const limit = parts.length === 0 ? 75 : 74
    let end = Math.min(start + limit, bytes.length)
    // Не разрезаем многобайтовый символ: продолжение начинается с 10xxxxxx
    while (end > start && end < bytes.length && (bytes[end]! & 0xC0) === 0x80) end--
    parts.push(dec.decode(bytes.slice(start, end)))
    start = end
  }
  return parts.join('\r\n ')
}

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYYMMDD из ISO-даты, без разбора в Date — сдвига часовых поясов не будет. */
function dateStamp(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '')
}

/** Следующий день для DTEND события на весь день. */
function nextDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d! + 1))
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
}

/**
 * Момент матча в UTC.
 *
 * Время в API московское. Москва с 2014 года стоит на UTC+3 круглый год, без
 * перехода на летнее время, — поэтому достаточно вычесть три часа и не тащить
 * в ленту блок VTIMEZONE. Если правила пояса когда-нибудь вернут переводы,
 * это место придётся переписать.
 */
function utcStamp(date: string, time: string, addHours = 0): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!, (hh ?? 0) - 3 + addHours, mm ?? 0))
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
    + `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
}

export default defineEventHandler(async (event) => {
  const { public: cfg } = useRuntimeConfig(event)
  const api = cfg.apiBase as string
  const site = (cfg.siteUrl as string).replace(/\/$/, '')

  const query = getQuery(event)
  const compFilter = Number(query.competition)
  const typeFilter = String(query.type ?? '')

  const get = <T>(path: string, q?: Record<string, unknown>) =>
    $fetch<T>(`${api}${path}`, { query: q, timeout: 8000 })

  let games: Game[] = []
  let competitions: Competition[] = []
  let teams: Team[] = []

  try {
    const [comps, teamPage] = await Promise.all([
      get<Page<Competition>>(ep.competitions, { page: 1, size: 200 }),
      get<Page<Team>>(ep.teams, { page: 1, size: 200 }),
    ])
    competitions = comps.items
    teams = teamPage.items

    // Тот же запрет, что на странице матчей: /games без фильтра не зовём.
    const wanted = competitions.filter((c) => {
      if (Number.isSafeInteger(compFilter) && compFilter > 0 && c.id !== compFilter) return false
      if (typeFilter && c.type !== typeFilter) return false
      return true
    })

    const per = await Promise.all(
      wanted.map(c => get<Game[]>(ep.competitionGames(c.id)).catch(() => [] as Game[])),
    )
    games = per.flat()
  }
  catch {
    // API недоступен — отдаём пустой, но валидный календарь. Клиент подписки
    // не должен получать 500: некоторые после ошибки отписываются сами.
  }

  const teamName = new Map(teams.map(t => [t.id, t.name]))
  const compName = new Map(competitions.map(c => [c.id, c.name]))
  const now = new Date()
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
    + `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Время звёзд//Календарь матчей//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc('Время звёзд — матчи')}`,
    'X-WR-TIMEZONE:Europe/Moscow',
    // Как часто перечитывать. X-PUBLISHED-TTL понимает Apple, REFRESH-INTERVAL — остальные.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ]

  for (const g of games) {
    const a = teamName.get(g.team_a_id) ?? `Команда №${g.team_a_id}`
    const b = teamName.get(g.team_b_id) ?? `Команда №${g.team_b_id}`
    const played = g.status === 'finished' && g.score_team_a != null && g.score_team_b != null
    const summary = played ? `${a} ${g.score_team_a}:${g.score_team_b} ${b}` : `${a} — ${b}`

    lines.push('BEGIN:VEVENT')
    // UID обязан быть стабильным: иначе при каждом обновлении ленты матч
    // добавлялся бы заново, а не заменял прежний.
    lines.push(`UID:game-${g.id}@timeofthestars.ru`)
    lines.push(`DTSTAMP:${stamp}`)

    if (g.time) {
      lines.push(`DTSTART:${utcStamp(g.date, g.time)}`)
      // Длительности в API нет; два часа — обычный хоккейный матч с раскаткой
      lines.push(`DTEND:${utcStamp(g.date, g.time, 2)}`)
    }
    else {
      // Время не проставлено — событие на весь день, а не выдуманный час
      lines.push(`DTSTART;VALUE=DATE:${dateStamp(g.date)}`)
      lines.push(`DTEND;VALUE=DATE:${nextDay(g.date)}`)
    }

    lines.push(fold(`SUMMARY:${esc(summary)}`))
    if (g.location) lines.push(fold(`LOCATION:${esc(g.location)}`))

    const parts = [compName.get(g.competition_id), `${site}/games/${g.id}`].filter(Boolean)
    lines.push(fold(`DESCRIPTION:${esc(parts.join('\n'))}`))
    lines.push(fold(`URL:${site}/games/${g.id}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  setHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=900')
  // Строки iCalendar разделяются именно CRLF
  return `${lines.join('\r\n')}\r\n`
})
