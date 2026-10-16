import type { CompetitionPlayerWithStats } from '#shared/types/api'

/**
 * Рейтинги игроков соревнования: снайперы, бомбардиры, ассистенты.
 *
 * Считаем из состава со статистикой (/competitions/{id}/players), который
 * страница соревнования и так загружает: там уже есть команда и игровой номер,
 * а у best-players team_id всегда null (подводный камень №7).
 */

export type LeaderMetric = 'goals' | 'points' | 'assists'

export interface LeaderRow {
  row: CompetitionPlayerWithStats
  /** место по основному показателю: при равенстве одно на всех (1, 2, 2, 4) */
  place: number
  value: number
}

type Compare = (a: CompetitionPlayerWithStats, b: CompetitionPlayerWithStats) => number

/**
 * Порядок внутри равного основного показателя. При равенстве выше тот, кто
 * сыграл меньше матчей: 5 голов за 3 игры весомее 5 голов за 8.
 * Полное равенство сохраняет порядок сервера (sort стабилен).
 */
const ORDER: Record<LeaderMetric, Compare> = {
  goals: (a, b) => b.goals - a.goals || a.games - b.games || b.points - a.points,
  points: (a, b) => b.points - a.points || b.goals - a.goals || a.games - b.games,
  assists: (a, b) => b.assists - a.assists || b.points - a.points || a.games - b.games,
}

export function buildLeaders(
  roster: CompetitionPlayerWithStats[],
  metric: LeaderMetric,
  limit = 10,
): LeaderRow[] {
  const top = roster.filter(p => p[metric] > 0).sort(ORDER[metric]).slice(0, limit)

  const out: LeaderRow[] = []
  top.forEach((row, i) => {
    const prev = out[i - 1]
    const value = row[metric]
    out.push({ row, value, place: prev && prev.value === value ? prev.place : i + 1 })
  })
  return out
}

/** Есть ли что показывать: хотя бы один гол или передача в соревновании */
export function hasLeaders(roster: CompetitionPlayerWithStats[]): boolean {
  return roster.some(p => p.points > 0)
}
