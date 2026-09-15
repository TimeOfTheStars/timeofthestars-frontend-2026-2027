import type { PlayerGoalMoment } from '#shared/types/api'

/**
 * Моменты голов игрока: группировка по матчам и подписи.
 *
 * Живёт отдельно от компонента по тому же правилу, что buildTimeline и
 * buildProtocol: разметка получает готовую структуру и ничего не считает.
 */

export interface MomentGame {
  gameId: number
  /** YYYY-MM-DD */
  date: string
  competitionName: string
  opponent: PlayerGoalMoment['opponent']
  /** счёт со стороны команды игрока; null у матча без проставленного счёта */
  scoreFor: number | null
  scoreAgainst: number | null
  moments: PlayerGoalMoment[]
}

/**
 * Группировка ПОДРЯД ИДУЩИХ моментов одного матча.
 *
 * Порядок с сервера уже нужный — свежие матчи сверху, внутри матча по игровому
 * времени, — поэтому своей сортировки нет. Группируем именно соседей, а не
 * собираем по словарю: словарь тихо склеил бы разнесённые записи и переставил
 * бы матчи, если серверный порядок однажды изменится. Тот же приём, что в
 * groupGamesByDate.
 */
export function groupMomentsByGame(moments: PlayerGoalMoment[]): MomentGame[] {
  const out: MomentGame[] = []

  for (const m of moments) {
    const last = out[out.length - 1]
    if (last && last.gameId === m.game_id) {
      last.moments.push(m)
      continue
    }
    out.push({
      gameId: m.game_id,
      date: m.date,
      competitionName: m.competition_name,
      opponent: m.opponent,
      scoreFor: m.score_for,
      scoreAgainst: m.score_against,
      moments: [m],
    })
  }

  return out
}

/**
 * Подпись момента: период и время либо «Буллит».
 *
 * У буллита period всегда null, а time_seconds — сквозное время, которое к
 * самому броску отношения не имеет: показывать «65:00» рядом с буллитом
 * значит выдумывать данные. Поэтому у буллита остаётся только слово.
 */
export function momentTitle(m: PlayerGoalMoment): string {
  if (m.type === 'shootout_goal') return 'Буллит'
  return `${periodLabel(m.period)} · ${gameClock(m.time_seconds)}`
}

/**
 * «передача: Иванов Иван» или null, если передач в протоколе нет.
 *
 * Имя стоит в именительном падеже, и предлог подобран под него: «с передачи
 * Иванов Иван» — сломанная фраза, а склонять фамилии в вебе не на чем.
 * Хронология матча по той же причине печатает имена ассистентов без предлога.
 *
 * Пустая передача — штатный случай даже у настоящего гола: в бумажном
 * протоколе её могли не записать (подводный камень №4 в API_FRONTEND_GOAL_MOMENTS).
 */
export function momentAssists(m: PlayerGoalMoment): string | null {
  const names = [m.assist1, m.assist2].filter(p => p != null).map(p => p.full_name)
  if (!names.length) return null
  return `${names.length > 1 ? 'передачи' : 'передача'}: ${names.join(', ')}`
}

/**
 * Полная подпись для скринридера.
 *
 * Строка на экране читается вместе с шапкой матча над ней, а кнопка в списке
 * элементов управления — сама по себе: без соперника и даты восемь кнопок
 * «1-й период · 16:00» неразличимы.
 */
export function momentLabel(m: PlayerGoalMoment): string {
  return `${momentTitle(m)}, ${ruDate(m.date)}, с командой «${m.opponent.name}» — смотреть момент`
}
