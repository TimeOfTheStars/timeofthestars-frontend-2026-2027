import type { $Fetch } from 'ofetch'
import type { Page, Team } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Справочник команд.
 *
 * В объектах матчей названий команд нет — только `team_a_id` / `team_b_id`
 * (подводный камень №1). Справочник грузится один раз за SSR-запрос, уезжает
 * в payload через useState и на клиенте больше не запрашивается.
 *
 * ⚠️ Грузить его в layouts/default.vue НЕЛЬЗЯ: не-lazy useAsyncData в лейауте
 * регистрирует onServerPrefetch на инстансе лейаута, а Vue дожидается
 * serverPrefetch компонента ДО рендера его поддерева — запрос страницы встанет
 * в очередь за справочником и удвоит TTFB. Поэтому ensureTeamDirectory()
 * вызывается внутри единственного useAsyncData страницы, в одном Promise.all
 * с её собственными запросами (см. usePageData).
 */

const MAX_SIZE = 200

function directoryState() {
  return useState<Record<number, Team>>('team-directory', () => ({}))
}

function loadedFlag() {
  return useState<boolean>('team-directory-loaded', () => false)
}

export async function ensureTeamDirectory($api: $Fetch): Promise<Record<number, Team>> {
  const state = directoryState()
  const loaded = loadedFlag()
  if (loaded.value) return state.value

  const first = await $api<Page<Team>>(ep.teams, { query: { page: 1, size: MAX_SIZE } })

  const map: Record<number, Team> = {}
  for (const t of first.items) map[t.id] = t

  // size ограничен 200 — если команд больше, доливаем страницы
  const pages = Math.ceil(first.total / MAX_SIZE)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        $api<Page<Team>>(ep.teams, { query: { page: i + 2, size: MAX_SIZE } }),
      ),
    )
    for (const p of rest) for (const t of p.items) map[t.id] = t
  }

  state.value = map
  loaded.value = true
  return map
}

export function useTeamDirectory() {
  const teams = directoryState()

  /** Объект команды или null — вызывающий решает, что рисовать вместо неё. */
  function team(id: number | null | undefined): Team | null {
    if (id == null) return null
    return teams.value[id] ?? null
  }

  /** Название команды. Фолбэк честный: id, а не выдуманное имя. */
  function teamName(id: number | null | undefined): string {
    if (id == null) return '—'
    return teams.value[id]?.name ?? `Команда №${id}`
  }

  return { teams, team, teamName }
}
