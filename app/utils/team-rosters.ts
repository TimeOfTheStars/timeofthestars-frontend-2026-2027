import type { $Fetch } from 'ofetch'
import type { Competition, CompetitionPlayerWithStats, Page } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/** Заявка существует до первого матча команды. */
export async function loadTeamRosters($api: $Fetch, teamId: number) {
  const first = await $api<Page<Competition>>(ep.competitions, { query: { page: 1, size: 200 } })
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(first.total / 200) - 1) }, (_, i) =>
      $api<Page<Competition>>(ep.competitions, { query: { page: i + 2, size: 200 } }),
    ),
  )
  const competitions = [first, ...remaining].flatMap(page => page.items)
  const entries = await Promise.all(competitions.map(async competition => ({
    competition,
    competitionId: competition.id,
    players: (await $api<CompetitionPlayerWithStats[]>(ep.roster(competition.id)))
      .filter(player => player.team_id === teamId),
  })))
  return entries.filter(entry => entry.players.length > 0)
}
