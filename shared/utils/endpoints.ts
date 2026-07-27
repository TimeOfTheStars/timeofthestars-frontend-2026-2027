/**
 * Единственное место, где живут строки путей API.
 *
 * Правило №1: НИ ОДИН путь не заканчивается слэшем. `/api/v1/teams/` отдаёт
 * 307 на `/api/v1/teams`, а часть fetch-обёрток теряет на редиректе query.
 * Проверяется `assertNoTrailingSlashes()` — вызывается в dev при старте.
 */

const V1 = '/api/v1'

export const ep = {
  homepage: `${V1}/homepage`,

  competitions: `${V1}/competitions`,
  competition: (id: number) => `${V1}/competitions/${id}`,
  competitionTeams: (id: number) => `${V1}/competitions/${id}/teams`,
  /** состав + статистика игроков в этом соревновании */
  roster: (id: number) => `${V1}/competitions/${id}/players`,
  standings: (id: number) => `${V1}/competitions/${id}/standings`,
  bestPlayers: (id: number) => `${V1}/competitions/${id}/best-players`,
  competitionGames: (id: number) => `${V1}/competitions/${id}/games`,

  /**
   * ⚠️ Только с фильтром. Пагинации у ручки нет, и без competition_id/team_id
   * она отдаёт все матчи лиги — единственный ответ этого API, растущий
   * неограниченно. Поэтому наружу отдаём только teamGames().
   */
  games: `${V1}/games`,
  game: (id: number) => `${V1}/games/${id}`,

  teams: `${V1}/teams`,
  team: (id: number) => `${V1}/teams/${id}`,

  players: `${V1}/players`,
  player: (id: number) => `${V1}/players/${id}`,
  playerStats: (id: number) => `${V1}/players/${id}/stats`,
  playerGames: (id: number) => `${V1}/players/${id}/games`,
} as const

/** Матчи команды — обе стороны. Единственный законный способ дёрнуть /games. */
export const teamGamesQuery = (teamId: number) => ({ team_id: teamId })

/**
 * Обходит все пути и падает, если где-то появился завершающий слэш.
 * Вызывается один раз в dev из плагина API.
 */
export function assertNoTrailingSlashes(): void {
  const bad: string[] = []
  for (const [key, value] of Object.entries(ep)) {
    const path = typeof value === 'function' ? value(1) : value
    if (path.length > 1 && path.endsWith('/')) bad.push(`${key} → ${path}`)
  }
  if (bad.length) {
    throw new Error(
      `[endpoints] завершающий слэш даст 307 и потерю query:\n  ${bad.join('\n  ')}`,
    )
  }
}
