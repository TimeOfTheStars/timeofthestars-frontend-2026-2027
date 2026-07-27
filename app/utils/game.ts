import type { Game } from '#shared/types/api'

export interface GameOutcome {
  /** оба счёта внесены */
  played: boolean
  /** id победителя, либо null (ничья или матч не сыгран) */
  winnerId: number | null
  loserId: number | null
  /** ничья по основному счёту */
  tied: boolean
  /** победа определена буллитами */
  shootout: boolean
  /** ничья, но победитель буллитов не указан — так тоже бывает */
  unresolvedTie: boolean
}

/**
 * Исход матча.
 *
 * `bullet_win_team_id` не заслуживает доверия сразу трояко — сервер его не
 * валидирует:
 *   1) может стоять на матче с НЕравным счётом — тогда игнорируем полностью;
 *   2) может быть null при равном счёте — «ничья, победитель не указан»;
 *   3) может указывать на команду, которой в этом матче нет.
 * Отсюда двойной гард ниже.
 */
export function gameOutcome(game: Game): GameOutcome {
  const a = game.score_team_a
  const b = game.score_team_b

  if (a == null || b == null) {
    return {
      played: false,
      winnerId: null,
      loserId: null,
      tied: false,
      shootout: false,
      unresolvedTie: false,
    }
  }

  if (a !== b) {
    const winnerId = a > b ? game.team_a_id : game.team_b_id
    const loserId = a > b ? game.team_b_id : game.team_a_id
    return { played: true, winnerId, loserId, tied: false, shootout: false, unresolvedTie: false }
  }

  // Счёт равный — только здесь буллиты вообще осмысленны
  const w = game.bullet_win_team_id
  const valid = w != null && (w === game.team_a_id || w === game.team_b_id)

  if (!valid) {
    return {
      played: true,
      winnerId: null,
      loserId: null,
      tied: true,
      shootout: false,
      unresolvedTie: w != null,
    }
  }

  return {
    played: true,
    winnerId: w,
    loserId: w === game.team_a_id ? game.team_b_id : game.team_a_id,
    tied: true,
    shootout: true,
    unresolvedTie: false,
  }
}

/** Матчи плей-офф — всё, кроме регулярки */
export function isPlayoff(game: Game): boolean {
  return game.stage !== 'matches'
}

/**
 * Группировка матчей по дате с сохранением серверного порядка
 * (дата → время → id). Своей сортировки не добавляем.
 */
export function groupGamesByDate(games: Game[]): { date: string; games: Game[] }[] {
  const out: { date: string; games: Game[] }[] = []
  for (const g of games) {
    const key = dateKey(g.date)
    const last = out[out.length - 1]
    if (last && last.date === key) last.games.push(g)
    else out.push({ date: key, games: [g] })
  }
  return out
}

/** Разделение на сыгранные и предстоящие — по статусу, а не по дате */
export function splitGames(games: Game[]) {
  return {
    played: games.filter(g => g.status === 'finished'),
    upcoming: games.filter(g => g.status === 'scheduled'),
  }
}
