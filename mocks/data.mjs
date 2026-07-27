/**
 * Датасет для мок-API. Инструмент разработки: позволяет пройти весь сайт,
 * когда в настоящей базе данных ещё мало.
 *
 * ДВА ПРИНЦИПА:
 *
 * 1. Всё производное ВЫЧИСЛЯЕТСЯ из матчей и протоколов по тем же правилам,
 *    что и на бэкенде (таблица, лучшие игроки, статистика игрока). Если
 *    прописать их руками, счёт в шапке матча разойдётся с протоколом, а
 *    таблица — с результатами, и сайт будет выглядеть сломанным.
 *
 * 2. Генератор ДЕТЕРМИНИРОВАННЫЙ (mulberry32 с фиксированным сеедом): после
 *    перезапуска цифры те же. Иначе каждый рестарт менял бы статистику, и
 *    сравнивать скриншоты было бы нельзя.
 *
 * Даты считаются ОТ СЕГОДНЯ, поэтому демо всегда выглядит «середина сезона»,
 * когда бы его ни запустили.
 */

// ─────────────────────────────────────────── детерминированный рандом

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20262027)
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1))
const pick = arr => arr[int(0, arr.length - 1)]

// ─────────────────────────────────────────── даты

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function iso(offsetDays) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offsetDays)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ─────────────────────────────────────────── команды

export const teams = [
  { id: 1, name: 'Сокол', slug: 'sokol', city: 'Москва', logo: true },
  { id: 2, name: 'Молния', slug: 'molniya', city: 'Москва', logo: true },
  { id: 3, name: 'Барс', slug: 'bars', city: 'Казань', logo: true },
  { id: 4, name: 'Комета', slug: 'kometa', city: 'Москва', logo: false },
  { id: 5, name: 'Вихрь', slug: 'vihr', city: null, logo: false },
  { id: 6, name: 'Торнадо', slug: 'tornado', city: 'Тверь', logo: true },
  { id: 7, name: 'Атлант', slug: 'atlant', city: 'Мытищи', logo: false },
  { id: 8, name: 'Витязь', slug: 'vityaz', city: 'Подольск', logo: true },
  { id: 9, name: 'ЦСКА', slug: 'cska', city: 'Москва', logo: false },
  // Длинное название и длинный город — проверка обрезки в узких колонках
  {
    id: 10,
    name: 'Академия хоккея имени Всеволода Боброва',
    slug: 'akademiya-hokkeya-imeni-vsevoloda-bobrova',
    city: 'Московская область, Красногорск',
    logo: false,
  },
  { id: 11, name: 'Ледокол', slug: 'ledokol', city: 'Архангельск', logo: false },
  { id: 12, name: 'Заря', slug: 'zarya', city: 'Тула', logo: false },
].map(t => ({
  id: t.id,
  name: t.name,
  slug: t.slug,
  city: t.city,
  // Часть команд без логотипа — это основной вид в реальной базе
  logo_url: t.logo ? `/media/team-${t.id}.svg` : null,
}))

// ─────────────────────────────────────────── игроки

const SURNAMES = [
  'Петров', 'Смирнов', 'Кузнецов', 'Попов', 'Морозов', 'Волков', 'Соколов',
  'Лебедев', 'Козлов', 'Новиков', 'Егоров', 'Павлов', 'Семёнов', 'Голубев',
  'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов', 'Беляев',
  'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев',
  'Ковалёв', 'Ильин', 'Гусев', 'Титов', 'Кудрявцев', 'Баранов', 'Куликов',
  'Алексеев', 'Степанов', 'Яковлев', 'Сорокин', 'Сергеев', 'Романов',
]
const FIRST = [
  'Иван', 'Сергей', 'Алексей', 'Дмитрий', 'Андрей', 'Максим', 'Никита',
  'Артём', 'Егор', 'Кирилл', 'Павел', 'Роман', 'Владимир', 'Денис', 'Илья',
]
const GRIPS = ['левый', 'правый', null, null]

/** Состав команды: 2 вратаря, 6 защитников, 10 нападающих */
const SQUAD = [
  ...Array.from({ length: 2 }, () => 'вратарь'),
  ...Array.from({ length: 6 }, () => 'защитник'),
  ...Array.from({ length: 10 }, () => 'нападающий'),
]

export const players = []
/** teamId → массив id игроков «основной» команды игрока */
const squadByTeam = new Map()

let pid = 1
for (const team of teams) {
  const ids = []
  const usedNumbers = new Set()
  for (const position of SQUAD) {
    let number
    do number = int(1, 99)
    while (usedNumbers.has(number))
    usedNumbers.add(number)

    players.push({
      id: pid,
      full_name: `${pick(FIRST)} ${pick(SURNAMES)}`,
      // Часть игроков без даты рождения — как в реальной базе
      birth_date: rnd() < 0.7 ? `${int(1985, 2007)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}` : null,
      position,
      grip: pick(GRIPS),
      photo_url: rnd() < 0.35 ? `/media/player-${pid}.svg` : null,
      _number: number,
    })
    ids.push(pid)
    pid++
  }
  squadByTeam.set(team.id, ids)
}

/** Один игрок с полностью пустой карточкой — проверка «нет ничего» */
players.push({
  id: pid,
  full_name: 'Безымянный Новичок',
  birth_date: null,
  position: null,
  grip: null,
  photo_url: null,
  _number: null,
})
squadByTeam.get(12).push(pid)
pid++

const playerById = new Map(players.map(p => [p.id, p]))

// ─────────────────────────────────────────── соревнования

export const competitions = [
  {
    id: 1,
    type: 'championship',
    name: 'Кубок Звёзд 2025/2026',
    start_date: iso(-330),
    end_date: iso(-100),
    location: 'Москва, ЛД «Арена»',
    logo_url: '/media/competition-1.svg',
    show_playoff_bracket: true,
    show_best_players: true,
    winner_team_id: null, // выставим после расчёта плей-офф
    _teams: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    id: 2,
    type: 'championship',
    name: 'Открытый чемпионат 2026/2027',
    start_date: iso(-70),
    // Сезон идёт — даты окончания нет
    end_date: null,
    location: 'Москва',
    logo_url: null,
    show_playoff_bracket: false,
    show_best_players: true,
    winner_team_id: null,
    _teams: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 3,
    type: 'tournament',
    name: 'Кубок Весны',
    start_date: iso(120),
    end_date: iso(123),
    // Место не указано — проверка отсутствующего поля
    location: null,
    logo_url: null,
    show_playoff_bracket: true,
    show_best_players: false,
    winner_team_id: null,
    _teams: [1, 4, 9, 11],
  },
]

// ─────────────────────────────────────────── заявки (составы соревнований)

/** {competition_id, team_id, player_id, number, contract} */
export const roster = []

for (const comp of competitions) {
  for (const teamId of comp._teams) {
    for (const playerId of squadByTeam.get(teamId)) {
      const p = playerById.get(playerId)
      roster.push({
        competition_id: comp.id,
        team_id: teamId,
        player_id: playerId,
        // Номер живёт в ЗАЯВКЕ: в разных соревнованиях он может отличаться
        number: comp.id === 2 && rnd() < 0.25 ? int(1, 99) : p._number,
        contract: rnd() < 0.75,
      })
    }
  }
}

/**
 * Два игрока сменили команду между сезонами — чтобы у них в разбивке
 * by_team было по две команды.
 */
for (const [playerId, newTeam] of [[3, 4], [25, 1]]) {
  const entry = roster.find(r => r.competition_id === 2 && r.player_id === playerId)
  if (entry) entry.team_id = newTeam
}

const rosterOf = (compId, teamId) =>
  roster.filter(r => r.competition_id === compId && r.team_id === teamId)

// ─────────────────────────────────────────── матчи

export const games = []
export const protocols = new Map() // gameId → строки протокола

let gid = 1

function addGame({ compId, a, b, dayOffset, stage = 'matches', time, location, played, forceEmptyProtocol = false }) {
  const id = gid++
  const isPlayed = played ?? dayOffset < 0

  let scoreA = null
  let scoreB = null
  let bulletWin = null

  if (isPlayed) {
    scoreA = int(0, 6)
    scoreB = int(0, 6)
    // Ничья с буллитами — проверка extra_points и чипа «по буллитам»
    if (scoreA === scoreB && rnd() < 0.6) bulletWin = rnd() < 0.5 ? a : b
    // В плей-офф ничьих не бывает: добиваем буллитами
    if (stage !== 'matches' && scoreA === scoreB && !bulletWin) bulletWin = a
  }

  const game = {
    id,
    competition_id: compId,
    team_a_id: a,
    team_b_id: b,
    score_team_a: scoreA,
    score_team_b: scoreB,
    date: iso(dayOffset),
    // Время у части будущих матчей не назначено
    time: time !== undefined ? time : (isPlayed || rnd() < 0.75 ? `${int(9, 21)}:${pick(['00', '30'])}:00` : null),
    location: location !== undefined ? location : (rnd() < 0.8 ? pick(['ЛД «Арена»', 'ЛД «Кристалл»', 'ЦСКА Арена', 'ЛД «Северный»']) : null),
    scan: isPlayed && rnd() < 0.4 ? `/media/scan-${id}.svg` : null,
    video_url: isPlayed && rnd() < 0.25 ? 'https://youtu.be/dQw4w9WgXcQ' : null,
    stage,
    status: isPlayed ? 'finished' : 'scheduled',
    bullet_win_team_id: bulletWin,
    round_no: null,
    bracket_slot: null,
    next_game_id: null,
  }
  games.push(game)

  // Протокол только у сыгранных. Часть сыгранных ОСТАЁТСЯ без протокола —
  // это штатное состояние: счёт внесли, состав по игрокам ещё нет.
  protocols.set(id, isPlayed && !forceEmptyProtocol ? buildProtocol(game) : [])
  return game
}

/**
 * Протокол, согласованный со счётом: сумма голов команды РАВНА её счёту.
 * Иначе box-score противоречил бы шапке матча.
 */
function buildProtocol(game) {
  const lines = []

  for (const [teamId, score, oppScore] of [
    [game.team_a_id, game.score_team_a, game.score_team_b],
    [game.team_b_id, game.score_team_b, game.score_team_a],
  ]) {
    const squad = rosterOf(game.competition_id, teamId)
    const goalies = squad.filter(r => playerById.get(r.player_id).position === 'вратарь')
    const skaters = squad.filter(r => playerById.get(r.player_id).position !== 'вратарь')

    // На лёд выходит часть заявки
    const lineup = skaters.slice(0, int(9, Math.min(14, skaters.length)))
    const stat = new Map(lineup.map(r => [r.player_id, { goals: 0, assists: 0, penalties: 0 }]))

    // Раскидываем голы команды по игрокам
    for (let i = 0; i < score; i++) {
      const scorer = pick(lineup).player_id
      stat.get(scorer).goals++
      // Передача — не всегда и не сам себе
      if (rnd() < 0.7) {
        const helper = pick(lineup).player_id
        if (helper !== scorer) stat.get(helper).assists++
      }
    }
    // Штрафы
    for (let i = 0; i < int(0, 4); i++) {
      stat.get(pick(lineup).player_id).penalties += pick([2, 2, 2, 4, 10])
    }

    for (const [playerId, s] of stat) {
      lines.push({
        player_id: playerId,
        team_id: teamId,
        goals: s.goals,
        assists: s.assists,
        penalties: s.penalties,
        is_goalie: false,
        goals_against: null,
        saves: null,
        minutes_played: null,
      })
    }

    // Вратарь: пропущено РАВНО счёту соперника
    if (goalies.length) {
      const g = goalies[0]
      lines.push({
        player_id: g.player_id,
        team_id: teamId,
        goals: 0,
        assists: rnd() < 0.08 ? 1 : 0,
        penalties: rnd() < 0.05 ? 2 : 0,
        is_goalie: true,
        goals_against: oppScore,
        saves: int(12, 34),
        minutes_played: 60,
      })
    }
  }

  return lines
}

// ── Кубок Звёзд: регулярка + канонический плей-офф (4 → 2 → 1)

const c1Teams = competitions[0]._teams
for (let round = 0; round < 6; round++) {
  for (let i = 0; i < c1Teams.length; i += 2) {
    const a = c1Teams[(i + round) % c1Teams.length]
    const b = c1Teams[(i + round + 1) % c1Teams.length]
    if (a === b) continue
    addGame({ compId: 1, a, b, dayOffset: -320 + round * 30 + i })
  }
}

// Плей-офф: 1/4 → 1/2 → финал, по одному матчу на пару
const qf = [[1, 8], [2, 7], [3, 6], [4, 5]]
const qfWinners = qf.map(([a, b], i) => {
  const g = addGame({ compId: 1, a, b, dayOffset: -150 + i, stage: 'quarterfinal' })
  return g.score_team_a > g.score_team_b ? a : g.score_team_b > g.score_team_a ? b : g.bullet_win_team_id
})
const sf = [[qfWinners[0], qfWinners[1]], [qfWinners[2], qfWinners[3]]]
const sfWinners = sf.map(([a, b], i) => {
  const g = addGame({ compId: 1, a, b, dayOffset: -125 + i, stage: 'semifinal' })
  return g.score_team_a > g.score_team_b ? a : g.score_team_b > g.score_team_a ? b : g.bullet_win_team_id
})
const finalGame = addGame({
  compId: 1, a: sfWinners[0], b: sfWinners[1], dayOffset: -100, stage: 'final',
  location: 'Москва, ЛД «Арена»',
})
competitions[0].winner_team_id
  = finalGame.score_team_a > finalGame.score_team_b
    ? finalGame.team_a_id
    : finalGame.score_team_b > finalGame.score_team_a
      ? finalGame.team_b_id
      : finalGame.bullet_win_team_id

// ── Открытый чемпионат: идёт прямо сейчас, матчи до и после сегодня

const c2Teams = competitions[1]._teams
let day = -68
for (let round = 0; round < 10; round++) {
  for (let i = 0; i < c2Teams.length; i += 2) {
    const a = c2Teams[(i + round) % c2Teams.length]
    const b = c2Teams[(i + round + 1) % c2Teams.length]
    if (a === b) continue
    // Один сыгранный матч намеренно оставляем без протокола
    const emptyProtocol = round === 3 && i === 0
    addGame({ compId: 2, a, b, dayOffset: day, forceEmptyProtocol: emptyProtocol })
  }
  day += 12
}

// ── Кубок Весны: всё впереди, счётов нет

const c3Teams = competitions[2]._teams
addGame({ compId: 3, a: c3Teams[0], b: c3Teams[1], dayOffset: 120, stage: 'semifinal', time: null, location: null })
addGame({ compId: 3, a: c3Teams[2], b: c3Teams[3], dayOffset: 120, stage: 'semifinal' })
addGame({ compId: 3, a: c3Teams[0], b: c3Teams[2], dayOffset: 123, stage: 'final' })

// Порядок как на сервере: дата → время → id
games.sort((x, y) =>
  x.date.localeCompare(y.date)
  || (x.time ?? '').localeCompare(y.time ?? '')
  || x.id - y.id,
)

// ─────────────────────────────────────────── производные данные

/**
 * Турнирная таблица. Правила бэкенда:
 *  • строки ТОЛЬКО для команд, заявленных в соревнование;
 *  • учитываются матчи stage === 'matches' с ОБОИМИ заполненными счетами;
 *  • победа 2, ничья 1, +1 победителю серии буллитов;
 *  • сортировка: очки ↓ → разница ↓ → заброшенные ↓.
 */
export function standingsOf(compId) {
  const comp = competitions.find(c => c.id === compId)
  if (!comp) return []

  const rows = new Map(
    comp._teams.map(id => [id, {
      team_id: id,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      goals_scored: 0,
      goals_conceded: 0,
      extra_points: 0,
    }]),
  )

  for (const g of games) {
    if (g.competition_id !== compId) continue
    if (g.stage !== 'matches') continue
    if (g.score_team_a == null || g.score_team_b == null) continue

    for (const [teamId, own, opp] of [
      [g.team_a_id, g.score_team_a, g.score_team_b],
      [g.team_b_id, g.score_team_b, g.score_team_a],
    ]) {
      const row = rows.get(teamId)
      if (!row) continue
      row.games++
      row.goals_scored += own
      row.goals_conceded += opp
      if (own > opp) row.wins++
      else if (own < opp) row.losses++
      else {
        row.draws++
        if (g.bullet_win_team_id === teamId) row.extra_points++
      }
    }
  }

  return [...rows.values()]
    .map(r => ({ ...r, points: r.wins * 2 + r.draws + r.extra_points }))
    .sort((a, b) =>
      b.points - a.points
      || (b.goals_scored - b.goals_conceded) - (a.goals_scored - a.goals_conceded)
      || b.goals_scored - a.goals_scored,
    )
}

/** Суммарная статистика игрока по набору матчей */
function totalsFor(lines) {
  const t = {
    games: 0, goals: 0, assists: 0, points: 0, penalties: 0,
    goals_against: 0, saves: 0, minutes_played: 0,
  }
  const seenGames = new Set()
  for (const { gameId, line } of lines) {
    seenGames.add(gameId)
    t.goals += line.goals
    t.assists += line.assists
    t.penalties += line.penalties
    t.goals_against += line.goals_against ?? 0
    t.saves += line.saves ?? 0
    t.minutes_played += line.minutes_played ?? 0
  }
  t.games = seenGames.size
  t.points = t.goals + t.assists
  return t
}

/** Все строки протоколов игрока: [{gameId, line, competitionId, teamId}] */
function linesOfPlayer(playerId) {
  const out = []
  for (const g of games) {
    const lines = protocols.get(g.id) ?? []
    for (const line of lines) {
      if (line.player_id === playerId) {
        out.push({ gameId: g.id, line, competitionId: g.competition_id, teamId: line.team_id })
      }
    }
  }
  return out
}

/** Учитываются ВСЕ стадии всех соревнований — как на бэкенде */
export function playerStats(playerId) {
  const all = linesOfPlayer(playerId)

  const byComp = new Map()
  const byTeam = new Map()
  for (const item of all) {
    if (!byComp.has(item.competitionId)) byComp.set(item.competitionId, [])
    byComp.get(item.competitionId).push(item)
    if (!byTeam.has(item.teamId)) byTeam.set(item.teamId, [])
    byTeam.get(item.teamId).push(item)
  }

  return {
    player_id: playerId,
    career: totalsFor(all),
    by_competition: [...byComp.entries()].map(([id, lines]) => ({
      competition_id: id,
      competition_name: competitions.find(c => c.id === id)?.name ?? `Соревнование ${id}`,
      totals: totalsFor(lines),
    })),
    by_team: [...byTeam.entries()].map(([id, lines]) => ({
      team_id: id,
      team_name: teams.find(t => t.id === id)?.name ?? `Команда ${id}`,
      totals: totalsFor(lines),
    })),
  }
}

/** Статистика игрока в рамках одного соревнования (для состава) */
export function playerCompetitionTotals(playerId, compId) {
  const lines = linesOfPlayer(playerId).filter(l => l.competitionId === compId)
  return totalsFor(lines)
}

/**
 * Лучшие игроки: сортировка по очкам ↓, учитываются ВСЕ стадии.
 * ⚠️ team_id сервер всегда отдаёт null — воспроизводим и это.
 */
export function bestPlayersOf(compId, limit = 10) {
  const agg = new Map()
  for (const g of games) {
    if (g.competition_id !== compId) continue
    for (const line of protocols.get(g.id) ?? []) {
      if (!agg.has(line.player_id)) {
        agg.set(line.player_id, { goals: 0, assists: 0, penalties: 0 })
      }
      const a = agg.get(line.player_id)
      a.goals += line.goals
      a.assists += line.assists
      a.penalties += line.penalties
    }
  }

  return [...agg.entries()]
    .map(([playerId, a]) => ({
      player: publicPlayer(playerById.get(playerId)),
      team_id: null,
      goals: a.goals,
      assists: a.assists,
      points: a.goals + a.assists,
      penalties: a.penalties,
    }))
    .sort((x, y) => y.points - x.points || y.goals - x.goals)
    .slice(0, limit)
}

/** Матчи, где у игрока ЕСТЬ строка протокола (не все матчи его команды) */
export function gamesOfPlayer(playerId) {
  const ids = new Set(linesOfPlayer(playerId).map(l => l.gameId))
  return games.filter(g => ids.has(g.id)).map(publicGame)
}

// ─────────────────────────────────────────── формы для выдачи

/** Внутренние поля (_number) наружу не отдаём */
export function publicPlayer(p) {
  if (!p) return null
  return {
    id: p.id,
    full_name: p.full_name,
    birth_date: p.birth_date,
    position: p.position,
    grip: p.grip,
    photo_url: p.photo_url,
  }
}

export function publicGame(g) {
  const { ...rest } = g
  return rest
}

export function publicTeam(t) {
  return { id: t.id, name: t.name, slug: t.slug, city: t.city, logo_url: t.logo_url }
}

export { playerById, protocols as protocolMap, rosterOf }
