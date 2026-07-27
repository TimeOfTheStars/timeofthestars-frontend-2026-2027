import type { Competition, Player, Team } from '#shared/types/api'

/**
 * `slug` есть только у команды, и API его нигде не принимает — все ручки
 * работают только по числовому `id` (подводный камень №17). Поэтому красивый
 * URL выглядит как `/teams/sokol-1`, а запрос всегда идёт по хвостовому числу.
 */
export function parseId(param: string | string[] | undefined): number | null {
  if (!param) return null
  const raw = Array.isArray(param) ? param[0] : param
  // Хвостовые цифры: «cska-1948-7» → 7, «7» → 7
  const m = /(\d+)$/.exec(raw ?? '')
  if (!m) return null
  const id = Number(m[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** Канонический путь команды. Сравнением с ним делается 301 со старого slug. */
export function teamPath(team: Pick<Team, 'id' | 'slug'>): string {
  return team.slug ? `/teams/${team.slug}-${team.id}` : `/teams/${team.id}`
}

export function playerPath(player: Pick<Player, 'id'>): string {
  return `/players/${player.id}`
}

export function competitionPath(competition: Pick<Competition, 'id'>): string {
  return `/competitions/${competition.id}`
}

export function gamePath(id: number): string {
  return `/games/${id}`
}
