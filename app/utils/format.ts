import type { GameStage, GameStatus, PlayerPosition } from '#shared/types/api'

// ─────────────────────────────── числа

/**
 * ЕДИНСТВЕННЫЙ форматтер статистики на проект. Без него `0` и `—` неизбежно
 * разъедутся между компонентами.
 *
 * Правило: `—` если игрок/команда не участвовали (`games === 0`);
 * `0` если участвовали и не забили. Ноль — это результат, прочерк — отсутствие.
 */
export function statNum(value: number | null | undefined, games?: number): string {
  if (value == null) return '—'
  if (games === 0) return '—'
  return String(value)
}

/** Поле, которого может не быть даже когда оно должно быть (вратарские). */
export function orDash(value: number | null | undefined): string {
  return value == null ? '—' : String(value)
}

/** Разница мячей — считается на клиенте, в API её нет. */
export function goalDiff(scored: number, conceded: number): string {
  const d = scored - conceded
  return d > 0 ? `+${d}` : String(d)
}

/** Русская плюрализация: plural(3, ['матч', 'матча', 'матчей']) → 'матча' */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

export function pluralWith(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`
}

// ─────────────────────────────── даты

/**
 * Разбирает `YYYY-MM-DD` как ЛОКАЛЬНУЮ дату.
 * `new Date('2026-01-05')` — это UTC-полночь, и в отрицательном часовом поясе
 * она показывается как 4 января. Поэтому только по компонентам.
 */
function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

const fmtFull = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fmtShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const fmtWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

/** «5 января 2026» */
export function ruDate(iso: string | null | undefined): string {
  const d = parseDate(iso)
  return d ? fmtFull.format(d) : '—'
}

/** «5 янв» — для плотных списков */
export function ruDateShort(iso: string | null | undefined): string {
  const d = parseDate(iso)
  return d ? fmtShort.format(d).replace('.', '') : '—'
}

/** «пн» */
export function ruWeekday(iso: string | null | undefined): string {
  const d = parseDate(iso)
  return d ? fmtWeekday.format(d) : ''
}

/** `19:30:00` → `19:30`; null → null (подпись «время уточняется» даёт компонент) */
export function ruTime(time: string | null | undefined): string | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : null
}

/**
 * Игровой секундомер: 30 → «0:30», 757 → «12:37», 3600 → «60:00».
 *
 * Часовой формы тут быть не должно: время в событиях сквозное, и конец
 * третьего периода — это 60:00, а не 1:00:00. Минуты не дополняем нулём —
 * «0:30» читается как секундомер, «00:30» уже как время суток.
 */
export function gameClock(seconds: number): string {
  const s = Math.max(0, Math.trunc(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Подпись периода. `null` бывает только у серии буллитов.
 *
 * Значений больше четвёртого API не обещает, но и не запрещает, поэтому
 * пятое и дальше подписываем номером, а не падаем.
 */
export function periodLabel(period: number | null): string {
  if (period == null) return 'Буллиты'
  if (period === 4) return 'Овертайм'
  return `${period}-й период`
}

/**
 * Период соревнования. Без даты окончания — «с 5 января 2026»,
 * а не диапазон с прочерком.
 */
export function ruDateRange(start: string, end: string | null | undefined): string {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s) return '—'
  if (!e) return `с ${fmtFull.format(s)}`
  if (s.getFullYear() === e.getFullYear()) {
    return `${fmtDayMonth.format(s)} — ${fmtFull.format(e)}`
  }
  return `${fmtFull.format(s)} — ${fmtFull.format(e)}`
}

/** Возраст из birth_date — в API его нет, считаем сами. */
export function age(birthDate: string | null | undefined): number | null {
  const d = parseDate(birthDate)
  if (!d) return null
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a >= 0 && a < 120 ? a : null
}

/** Ключ для группировки матчей по дате */
export function dateKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Сегодня в формате API — для деления матчей на прошедшие и будущие */
export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ─────────────────────────────── подписи

/** API отдаёт только сырые значения — подписи держим у себя. */
export const STAGE_LABEL: Record<GameStage, string> = {
  matches: 'Регулярный сезон',
  quarterfinal: '1/4 финала',
  semifinal: '1/2 финала',
  final: 'Финал',
  third_place: 'Матч за 3-е место',
}

export const STAGE_SHORT: Record<GameStage, string> = {
  matches: 'Регулярка',
  quarterfinal: '1/4',
  semifinal: '1/2',
  final: 'Финал',
  third_place: 'За 3-е место',
}

/**
 * status бывает только scheduled | finished. Слова «скоро», «live»,
 * «в прямом эфире» запрещены — API не может выразить это состояние.
 */
export const STATUS_LABEL: Record<GameStatus, string> = {
  scheduled: 'Запланирован',
  finished: 'Завершён',
}

/** Позиция в бейдж одной буквой: экономит ~40px в таблице состава. */
export function positionShort(position: PlayerPosition | null): string | null {
  if (!position) return null
  return { 'вратарь': 'В', 'защитник': 'З', 'нападающий': 'Н' }[position] ?? null
}

export const COMPETITION_TYPE_LABEL = {
  championship: 'Чемпионат',
  tournament: 'Турнир',
} as const
