import type { Competition, CompetitionType, Game } from '#shared/types/api'

/**
 * Раскладка календаря матчей: фильтры и порядок блоков.
 *
 * Живёт отдельно от страницы по тому же принципу, что buildProtocol и
 * buildTimeline: компонент получает готовую структуру и ничего не вычисляет.
 */

export type CalendarStatus = 'finished' | 'scheduled'
export type CalendarSort = 'upcoming' | 'results'

export interface CalendarFilters {
  /** id соревнования; null — все */
  competition: number | null
  /** тип соревнования; null — все */
  type: CompetitionType | null
  /** статус матча; null — все */
  status: CalendarStatus | null
  /** какой блок идёт первым */
  sort: CalendarSort
}

export const DEFAULT_FILTERS: CalendarFilters = {
  competition: null,
  type: null,
  status: null,
  sort: 'upcoming',
}

const TYPES: CompetitionType[] = ['championship', 'tournament']
const STATUSES: CalendarStatus[] = ['finished', 'scheduled']

/**
 * Разбор фильтров из адреса.
 *
 * Мусор молча откатывается к умолчанию: чужая или устаревшая ссылка — не
 * ошибка пользователя, показывать ей 404 не за что.
 */
export function parseFilters(query: Record<string, unknown>): CalendarFilters {
  const compRaw = Number(query.competition)
  const type = String(query.type ?? '')
  const status = String(query.status ?? '')

  return {
    competition: Number.isSafeInteger(compRaw) && compRaw > 0 ? compRaw : null,
    type: TYPES.includes(type as CompetitionType) ? (type as CompetitionType) : null,
    status: STATUSES.includes(status as CalendarStatus) ? (status as CalendarStatus) : null,
    sort: query.sort === 'results' ? 'results' : 'upcoming',
  }
}

/** Сколько фильтров отличается от умолчания — для счётчика на кнопке. */
export function activeFilterCount(f: CalendarFilters): number {
  return (f.competition != null ? 1 : 0)
    + (f.type != null ? 1 : 0)
    + (f.status != null ? 1 : 0)
    + (f.sort !== DEFAULT_FILTERS.sort ? 1 : 0)
}

/**
 * Порядок матчей: дата → время → id, как их отдаёт сервер.
 *
 * Сортировка ОБЯЗАТЕЛЬНА, а не украшение. Матчи приходят пачкой на каждое
 * соревнование, и склеенный список идёт «все матчи турнира А, потом все
 * матчи турнира Б». groupGamesByDate группирует ПОДРЯД ИДУЩИЕ элементы, а не
 * собирает по словарю, — на несортированном входе он выдаст одну и ту же дату
 * несколькими заголовками.
 */
function byDate(a: Game, b: Game): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const at = a.time ?? ''
  const bt = b.time ?? ''
  if (at !== bt) return at < bt ? -1 : 1
  return a.id - b.id
}

export interface Calendar {
  upcoming: Game[]
  played: Game[]
  /** Блок «Результаты» идёт первым */
  resultsFirst: boolean
  /** После фильтров не осталось ничего */
  isEmpty: boolean
}

export function buildCalendar(
  games: Game[],
  competitions: Competition[],
  filters: CalendarFilters,
): Calendar {
  const byId = new Map(competitions.map(c => [c.id, c]))

  const filtered = games.filter((g) => {
    if (filters.competition != null && g.competition_id !== filters.competition) return false
    if (filters.type != null && byId.get(g.competition_id)?.type !== filters.type) return false
    if (filters.status != null && g.status !== filters.status) return false
    return true
  })

  const { played, upcoming } = splitGames(filtered)

  return {
    // Ближайшие — по возрастанию: первым идёт тот, что скоро.
    upcoming: [...upcoming].sort(byDate),
    // Результаты — наоборот: свежий сверху, он интереснее прошлогоднего.
    played: [...played].sort((a, b) => byDate(b, a)),
    resultsFirst: filters.sort === 'results',
    isEmpty: filtered.length === 0,
  }
}
