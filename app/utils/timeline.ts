import type { GameEvent, GameWithProtocol } from '#shared/types/api'

/**
 * Хронология матча: голы, удаления, смены вратаря и победный буллит.
 *
 * Как и с протоколом, вся раскладка живёт здесь, а компонент получает готовую
 * структуру и ничего не вычисляет.
 */

export interface TimelineEvent extends GameEvent {
  /**
   * Колонка события. null — если team_id не совпал ни с одной стороной матча
   * (админ переназначил игрока после ввода). Такое событие нельзя молча
   * выбросить: голы разошлись бы со счётом в шапке.
   */
  side: 'a' | 'b' | null
  /** Счёт ПОСЛЕ этого события. Буллит в него не входит. */
  scoreA: number
  scoreB: number
}

export interface TimelinePeriod {
  period: number | null
  label: string
  events: TimelineEvent[]
}

export interface Timeline {
  /** Периоды в порядке появления: 1–3 и овертайм */
  periods: TimelinePeriod[]
  /** period === null — серия буллитов, отдельным блоком */
  shootout: TimelineEvent[]
  isEmpty: boolean
}

export function buildTimeline(game: GameWithProtocol): Timeline {
  const events = game.events ?? []

  let scoreA = 0
  let scoreB = 0

  const decorated: TimelineEvent[] = events.map((e) => {
    const side = e.team_id === game.team_a_id
      ? 'a' as const
      : e.team_id === game.team_b_id ? 'b' as const : null

    // В счёт идёт ТОЛЬКО goal. shootout_goal не считается: сумма голов
    // по команде обязана сходиться со score_team_*, а победа в серии
    // берётся из bullet_win_team_id.
    if (e.type === 'goal') {
      if (side === 'a') scoreA += 1
      else if (side === 'b') scoreB += 1
    }

    return { ...e, side, scoreA, scoreB }
  })

  /**
   * Группируем В ПОРЯДКЕ ПОЯВЛЕНИЯ, а не по возрастанию номера периода.
   *
   * Массив уже отсортирован сервером (время → sort_order → id), и своя
   * сортировка тут только навредит: по одному time_seconds она перемешала бы
   * события, случившиеся в одну секунду, — в матче 18.08 таких две пары
   * (обе смены вратаря на 0:00).
   *
   * Ровное время относится к ЗАВЕРШИВШЕМУСЯ периоду: 20:00 → период 1,
   * 60:00 → период 3. Так гол на последней секунде не уезжает в следующий
   * период. Побочный эффект — смена вратаря ровно в 20:00 окажется в конце
   * первого периода; на ленте позиция та же, отдельно обрабатывать не нужно.
   */
  const periods: TimelinePeriod[] = []
  const shootout: TimelineEvent[] = []

  for (const e of decorated) {
    if (e.period == null) {
      shootout.push(e)
      continue
    }
    const last = periods[periods.length - 1]
    if (last && last.period === e.period) {
      last.events.push(e)
    }
    else {
      periods.push({ period: e.period, label: periodLabel(e.period), events: [e] })
    }
  }

  return { periods, shootout, isEmpty: events.length === 0 }
}

/**
 * Подпись игрока события. Та же дисциплина, что в протоколе: подписывать
 * «Игрок №7» нельзя — player_id прочитается как номер на майке.
 */
export function eventPlayerName(player: GameEvent['player']): { text: string; unnamed: boolean } {
  return player
    ? { text: player.full_name, unnamed: false }
    : { text: 'без имени', unnamed: true }
}

/** Ассистенты гола, уже отфильтрованные от null. У гола их бывает 0, 1 или 2. */
export function assistsOf(event: GameEvent): NonNullable<GameEvent['assist1']>[] {
  return [event.assist1, event.assist2].filter(a => a != null)
}
