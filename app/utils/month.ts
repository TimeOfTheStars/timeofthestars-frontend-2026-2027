import type { Game } from '#shared/types/api'

/**
 * Сетка месяца для календаря матчей.
 *
 * Вся арифметика дат — на локальных компонентах, без Date.toISOString().
 * Тот переводит дату в UTC, и `new Date(2026, 8, 1)` в московском поясе
 * превращается в «2026-08-31»: календарь молча съезжал бы на день. Тот же
 * приём уже применён в todayIso() и приватном parseDate() в format.ts.
 */

export interface MonthCell {
  /** YYYY-MM-DD */
  iso: string
  day: number
  /** false у хвостов соседних месяцев — их показываем приглушённо */
  inMonth: boolean
  isToday: boolean
  games: Game[]
}

export interface MonthGrid {
  year: number
  /** 1–12 */
  month: number
  /** «сентябрь 2026» */
  title: string
  /** ВСЕГДА 6 строк по 7 дней */
  weeks: MonthCell[][]
  /** YYYY-MM соседних месяцев — для ссылок */
  prev: string
  next: string
  /** сколько матчей попало в месяц (без хвостов) */
  total: number
}

const fmtMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

/** Дни недели с понедельника — русская неделя, а не американская. */
export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD из локальных компонентов даты. НЕ через toISOString, см. выше. */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM → {year, month}. Мусор и выход за границы дают null. */
export function parseMonth(value: unknown): { year: number, month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value ?? ''))
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null
  return { year, month }
}

/** Сдвиг на месяцы с переходом через год. */
export function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function buildMonth(month: string, games: Game[], today: string): MonthGrid {
  const parsed = parseMonth(month) ?? parseMonth(today.slice(0, 7))!
  const { year, month: m } = parsed

  const byDate = new Map<string, Game[]>()
  for (const g of games) {
    const key = g.date.slice(0, 10)
    const list = byDate.get(key)
    if (list) list.push(g)
    else byDate.set(key, [g])
  }

  const first = new Date(year, m - 1, 1)
  // getDay() отдаёт 0 для воскресенья, а неделя у нас с понедельника
  const offset = (first.getDay() + 6) % 7

  const weeks: MonthCell[][] = []
  let total = 0

  // Ровно 6 строк независимо от месяца: у одних месяцев недель 5, у других 6,
  // и без фиксации сетка прыгала бы по высоте при переключении.
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, m - 1, 1 - offset + w * 7 + d)
      const iso = isoOf(date)
      const inMonth = date.getMonth() === m - 1
      const cellGames = byDate.get(iso) ?? []
      if (inMonth) total += cellGames.length
      week.push({
        iso,
        day: date.getDate(),
        inMonth,
        isToday: iso === today,
        games: cellGames,
      })
    }
    weeks.push(week)
  }

  return {
    year,
    month: m,
    title: fmtMonth.format(first).replace(' г.', ''),
    weeks,
    prev: shiftMonth(year, m, -1),
    next: shiftMonth(year, m, 1),
    total,
  }
}
