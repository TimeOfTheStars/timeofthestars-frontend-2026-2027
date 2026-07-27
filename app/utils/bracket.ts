import type { Game, GameStage } from '#shared/types/api'

/**
 * Сборка сетки плей-офф из плоского Game[].
 *
 * Отдельной ручки нет, а поля сетки (round_no / bracket_slot / next_game_id)
 * заполняются в админке руками и сервером не валидируются. Строить дерево по
 * next_game_id нельзя: одна опечатка даёт уверенно неверную картину, которую
 * читатель никак не может распознать. Поэтому единственная опора — `stage`.
 *
 * Единица раскладки — ПАРА (Tie), а не матч: матчи одной стадии с одинаковой
 * (неупорядоченной) парой команд сворачиваются в одну пару. Это гасит самую
 * частую ошибку заполнения — два-три матча на одну пару (настоящая серия или
 * дубль), — превращая «два финала» обратно в один финал с двумя матчами.
 */

/** Глубина от финала. Порядок вывода — обратный: 1/4 → 1/2 → финал. */
const DEPTH: Record<string, number> = { final: 0, semifinal: 1, quarterfinal: 2 }
const ORDER: GameStage[] = ['quarterfinal', 'semifinal', 'final']

export interface Tie {
  key: string
  stage: GameStage
  teamAId: number
  teamBId: number
  games: Game[]
  winsA: number
  winsB: number
  /** победитель пары, либо null (не определён) */
  winnerId: number | null
  /** хотя бы один матч пары сыгран */
  anyPlayed: boolean
  /** все матчи пары сыграны */
  allPlayed: boolean
}

export interface StageGroup {
  stage: GameStage
  ties: Tie[]
}

export interface Bracket {
  groups: StageGroup[]
  /**
   * Сетка похожа на настоящее дерево: стадии идут подряд от финала и в каждой
   * ровно 2^глубина пар. Только в этом случае на десктопе включаются
   * соединители — иначе рисовать дерево значило бы врать.
   */
  canonical: boolean
  tieCount: number
}

export function buildBracket(games: Game[]): Bracket {
  const playoff = games.filter(g => g.stage !== 'matches')

  const byKey = new Map<string, Tie>()

  for (const g of playoff) {
    const lo = Math.min(g.team_a_id, g.team_b_id)
    const hi = Math.max(g.team_a_id, g.team_b_id)
    const key = `${g.stage}:${lo}-${hi}`

    let tie = byKey.get(key)
    if (!tie) {
      // Команда A первого матча пары задаёт порядок вывода: score_team_a
      // привязан к team_a_id, и переставлять их — значит разойтись
      // с протоколом матча и с админкой.
      tie = {
        key,
        stage: g.stage,
        teamAId: g.team_a_id,
        teamBId: g.team_b_id,
        games: [],
        winsA: 0,
        winsB: 0,
        winnerId: null,
        anyPlayed: false,
        allPlayed: true,
      }
      byKey.set(key, tie)
    }

    tie.games.push(g)

    const o = gameOutcome(g)
    if (o.played) {
      tie.anyPlayed = true
      if (o.winnerId === tie.teamAId) tie.winsA++
      else if (o.winnerId === tie.teamBId) tie.winsB++
    }
    else {
      tie.allPlayed = false
    }
  }

  for (const tie of byKey.values()) {
    tie.winnerId
      = tie.winsA > tie.winsB ? tie.teamAId : tie.winsB > tie.winsA ? tie.teamBId : null
  }

  const groups: StageGroup[] = []
  for (const stage of ORDER) {
    const ties = [...byKey.values()].filter(t => t.stage === stage)
    // Стадия без пар заголовка не получает
    if (ties.length) groups.push({ stage, ties })
  }

  return {
    groups,
    canonical: isCanonical(groups, playoff),
    tieCount: byKey.size,
  }
}

function isCanonical(groups: StageGroup[], playoff: Game[]): boolean {
  // (а) нет неизвестных стадий
  if (playoff.some(g => DEPTH[g.stage] == null)) return false
  if (!groups.length) return false

  const depths = groups.map(g => DEPTH[g.stage]!).sort((a, b) => a - b)

  // (б) глубины идут подряд начиная с финала: {0}, {0,1}, {0,1,2}
  for (let i = 0; i < depths.length; i++) if (depths[i] !== i) return false

  // (в) в каждой стадии ровно 2^глубина пар
  for (const g of groups) {
    if (g.ties.length !== 2 ** DEPTH[g.stage]!) return false
  }
  return true
}
