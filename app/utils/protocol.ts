import type { GameWithProtocol, PlayerStatLine } from '#shared/types/api'

/**
 * Разбор протокола матча. Каждая мина ниже — реальная порча данных, а не
 * теоретическая: протокол вносят руками в админке.
 */

const collator = new Intl.Collator('ru')

export interface ProtocolSide {
  teamId: number
  lines: PlayerStatLine[]
  goalies: PlayerStatLine[]
}

export interface Protocol {
  a: ProtocolSide
  b: ProtocolSide
  /**
   * Строки, чей team_id не совпал НИ с team_a_id, НИ с team_b_id — так бывает,
   * если админ переназначил игрока после внесения протокола. Раскладка строго
   * в два ведра молча съела бы эти голы, и протокол разошёлся бы с шапкой счёта.
   */
  orphans: PlayerStatLine[]
  isEmpty: boolean
}

/**
 * Порядок строк считается ТОЛЬКО по полям протокола: очки ↓ → голы ↓ →
 * вратари в конец → ФИО. Игровые номера сюда не входят намеренно — они
 * приезжают отдельным отложенным запросом, и если бы они влияли на сортировку,
 * список бы перестроился у пользователя на глазах.
 */
function sortLines(lines: PlayerStatLine[]): PlayerStatLine[] {
  return [...lines].sort((x, y) => {
    const px = x.goals + x.assists
    const py = y.goals + y.assists
    if (px !== py) return py - px
    if (x.goals !== y.goals) return y.goals - x.goals
    if (x.is_goalie !== y.is_goalie) return x.is_goalie ? 1 : -1
    return collator.compare(x.player?.full_name ?? '', y.player?.full_name ?? '')
  })
}

export function buildProtocol(game: GameWithProtocol): Protocol {
  const lines = game.player_stats ?? []

  const pick = (teamId: number) => {
    const own = lines.filter(l => l.team_id === teamId)
    return {
      teamId,
      lines: sortLines(own),
      // Вратарская таблица ДОПОЛНЯЕТ основную, а не заменяет: у вратаря бывают
      // свои голы, передачи и штрафы, и унеся его из общей таблицы целиком,
      // мы бы просто потеряли их со страницы.
      goalies: sortLines(own.filter(l => l.is_goalie)),
    }
  }

  const orphans = lines.filter(
    l => l.team_id !== game.team_a_id && l.team_id !== game.team_b_id,
  )

  return {
    a: pick(game.team_a_id),
    b: pick(game.team_b_id),
    orphans: sortLines(orphans),
    isEmpty: lines.length === 0,
  }
}

/**
 * Подпись игрока в строке протокола.
 *
 * `player` может быть null. Подписывать «Игрок №7» НЕЛЬЗЯ: player_id прочитается
 * как номер на майке, и ему поверят. Поэтому — «без имени», курсивом и без ссылки.
 */
export function lineName(line: PlayerStatLine): { text: string; unnamed: boolean } {
  return line.player
    ? { text: line.player.full_name, unnamed: false }
    : { text: 'без имени', unnamed: true }
}

/**
 * Ключ строки. В протоколе бывают ДВЕ строки с одним player_id (двойной ввод):
 * ключ только по player_id схлопнулся бы, и Vue перепутал бы строки при
 * перерисовке.
 */
export function lineKey(line: PlayerStatLine, index: number): string {
  return `${line.team_id}-${line.player_id}-${index}`
}
