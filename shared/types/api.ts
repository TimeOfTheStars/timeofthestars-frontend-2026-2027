/**
 * Типы ответов API. Переписаны из API_FRONTEND.md, раздел 6 — соответствуют
 * ответам один в один. Проверить расхождение с бэкендом: `npm run types:api`
 * (детектор дрейфа, вне сборки — API может быть недоступен при билде).
 */

// ─────────────────────────────── перечисления

export type CompetitionType = 'championship' | 'tournament'
export type GameStage = 'matches' | 'quarterfinal' | 'semifinal' | 'final'
export type GameStatus = 'scheduled' | 'finished'
/** ⚠️ значения приходят на русском, не латиницей */
export type PlayerPosition = 'вратарь' | 'защитник' | 'нападающий'

// ─────────────────────────────── общее

/** Конверт только у команд, игроков и соревнований. size максимум 200. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** detail — строка для 404, массив объектов для 422 */
export interface ApiError {
  detail:
    | string
    | { type: string; loc: (string | number)[]; msg: string; input?: unknown }[]
  code?: string
}

// ─────────────────────────────── справочники

export interface Team {
  id: number
  name: string
  /** уникален, генерируется транслитерацией. API его НЕ принимает — только id. */
  slug: string
  city: string | null
  /** относительный: /media/… */
  logo_url: string | null
}

export interface Player {
  id: number
  full_name: string
  /** YYYY-MM-DD */
  birth_date: string | null
  position: PlayerPosition | null
  /** хват — свободная строка, не enum */
  grip: string | null
  /** относительный: /media/… */
  photo_url: string | null
}

// ─────────────────────────────── соревнования

export interface Competition {
  id: number
  type: CompetitionType
  name: string
  start_date: string
  end_date: string | null
  location: string | null
  logo_url: string | null
  show_playoff_bracket: boolean
  show_best_players: boolean
  winner_team_id: number | null
}

/** Заявка игрока в соревновании. Игровой номер живёт здесь, а не в Player. */
export interface RosterPlayer {
  player: Player
  team_id: number
  number: number | null
  contract: boolean
}

export interface RosterTeam {
  team: Team
  players: RosterPlayer[]
}

/** Заявка + статистика игрока именно в этом соревновании */
export interface CompetitionPlayerWithStats extends RosterPlayer {
  goals: number
  assists: number
  /** = goals + assists */
  points: number
  penalties: number
  games: number
}

// ─────────────────────────────── статистика

export interface StandingRow {
  /** объект команды вложен целиком — справочник здесь не нужен */
  team: Team
  games: number
  wins: number
  losses: number
  draws: number
  goals_scored: number
  goals_conceded: number
  /** очки за победу по буллитам; УЖЕ входят в points */
  extra_points: number
  /** = wins * 2 + draws + extra_points */
  points: number
}

export interface PlayerStatTotals {
  games: number
  goals: number
  assists: number
  points: number
  penalties: number
  /** вратарские; у полевых всегда 0 */
  goals_against: number
  saves: number
  minutes_played: number
}

export interface PlayerStatsBreakdown {
  player_id: number
  /** ⚠️ только career меняется query-фильтрами; разбивки всегда по всей карьере */
  career: PlayerStatTotals
  by_competition: {
    competition_id: number
    competition_name: string
    totals: PlayerStatTotals
  }[]
  by_team: { team_id: number; team_name: string; totals: PlayerStatTotals }[]
}

export interface BestPlayer {
  player: Player
  /**
   * ⚠️ Сервер сейчас ВСЕГДА отдаёт null (подводный камень №7) — команду искать
   * в /competitions/{id}/players. Тип оставлен `number | null` осознанно:
   * зашить `null` — значит поломать компиляцию всем потребителям в день,
   * когда бэкенд это починит.
   */
  team_id: number | null
  goals: number
  assists: number
  points: number
  penalties: number
}

// ─────────────────────────────── матчи

export interface Game {
  id: number
  competition_id: number
  /** названий команд НЕТ — нужен справочник команд */
  team_a_id: number
  team_b_id: number
  score_team_a: number | null
  score_team_b: number | null
  /** YYYY-MM-DD */
  date: string
  /** HH:MM:SS */
  time: string | null
  location: string | null
  /** URL скана бумажного протокола (PDF или картинка) */
  scan: string | null
  video_url: string | null
  stage: GameStage
  status: GameStatus
  /** осмыслен только при равном счёте, и сервер его не валидирует */
  bullet_win_team_id: number | null
  /** поля сетки плей-офф: заполняются руками, не валидируются, часто null */
  round_no: number | null
  bracket_slot: number | null
  next_game_id: number | null
}

/** Строка протокола матча */
export interface PlayerStatLine {
  player_id: number
  team_id: number
  goals: number
  assists: number
  penalties: number
  is_goalie: boolean
  /** непусты только у вратарей — но и у вратаря могут быть null */
  goals_against: number | null
  saves: number | null
  minutes_played: number | null
  /** теоретически null — подстраховаться обязательно */
  player: Player | null
}

/**
 * Событие хронологии матча.
 *
 * Приходит только в `GET /games/{id}`; список матчей событий НЕ содержит.
 * Массив уже отсортирован сервером: время → sort_order → id.
 */
export type GameEventType = 'goal' | 'shootout_goal' | 'penalty' | 'goalie_change'

export interface GameEvent {
  id: number
  type: GameEventType
  team_id: number
  /** СКВОЗНОЕ время от начала матча: 1500 — это 25:00, а не 5:00 второго периода */
  time_seconds: number
  /** 1–3, 4 — овертайм, null у shootout_goal */
  period: number | null
  /** разводит события одной секунды; сервер уже применил его при сортировке */
  sort_order: number
  /** гол — автор, удаление — оштрафованный, смена вратаря — КТО ВЫШЕЛ на лёд */
  player_id: number
  /** теоретически null — подстраховаться обязательно */
  player: Player | null
  assist1_player_id: number | null
  assist2_player_id: number | null
  assist1: Player | null
  assist2: Player | null
  /** только penalty, в МИНУТАХ: два двухминутных дадут 4, а не 2 */
  penalty_minutes: number | null
  /** конец удаления, считает сервер: начало + минуты */
  penalty_end_seconds: number | null
  /** только голы; смещение в Game.video_url. Пока не проставлен нигде */
  video_seconds: number | null
}

/**
 * Командная статистика матча: та самая карточка «итоги матча» с бросками,
 * вбрасываниями и реализацией.
 *
 * Приходит массивом на две команды, но полагаться на это нельзя: у матча без
 * внесённой статистики он пустой, а заполнить могут и одну сторону.
 */
export interface GameTeamStat {
  team_id: number
  /** null, пока не внесли; 0 — это внесённый ноль, и путать их нельзя */
  shots: number | null
  shots_on_goal: number | null
  /** ВЫИГРАННЫЕ вбрасывания, а не сыгранные: суммы двух команд не равны */
  faceoffs_won: number | null
  /** проценты, 0–100 */
  conversion_percent: number | null
  /** единственное поле без null: сервер всегда считает его из событий */
  penalty_minutes: number
}

export interface GameWithProtocol extends Game {
  /** может быть пустым даже у сыгранного матча со счётом */
  player_stats: PlayerStatLine[]
  /**
   * Пуст даже у сыгранного матча: хронологию заполняют не всегда, а числа в
   * player_stats при этом могут остаться от прежнего ручного ввода.
   */
  events: GameEvent[]
  /** Пуст, пока статистику не внесли руками. Внесена далеко не у всех матчей. */
  team_stats: GameTeamStat[]
}

// ─────────────────────────────── главная

/** Краткое соревнование: приходит вложенным в блок главной. */
export interface CompetitionBrief {
  id: number
  type: CompetitionType
  name: string
  logo_url: string | null
}

export type HomepageBlockType = 'standings' | 'bracket'

export interface HomepageBlock {
  id: number
  /** порядок на странице; сортируем по нему, а не полагаемся на порядок массива */
  position: number
  type: HomepageBlockType
  competition_id: number
  /** своя подпись из админки; null — берём название соревнования */
  title: string | null
  /**
   * Соревнование блока. Благодаря ему отдельный запрос за названием больше
   * не нужен. Схема допускает null, поэтому фолбэк на competition_id обязан
   * остаться.
   */
  competition: CompetitionBrief | null
}

export interface Homepage {
  /** До ТРЁХ блоков. Пустой массив — штатное состояние, не ошибка. */
  blocks: HomepageBlock[]
  /**
   * Поля ниже — прежний способ задать один блок таблицы и один сетки.
   * Сервер их всё ещё отдаёт, поэтому оставлены как запасной источник:
   * если blocks пуст, а флаги выставлены, главная не должна опустеть.
   */
  show_bracket: boolean
  bracket_competition_id: number | null
  show_standings: boolean
  standings_competition_id: number | null
}
