/**
 * Мок-API лиги. Инструмент разработки: полный набор данных, чтобы пройти
 * весь сайт, когда в настоящей базе ещё мало.
 *
 *   npm run mock       — поднять мок на :8099
 *   npm run dev:mock   — dev-сервер, смотрящий на мок
 *
 * Контракт повторяется ТОЧНО по API_FRONTEND.md: конверты Page<T> только
 * у трёх ручек, остальное — простые массивы; серверные сортировки; форма
 * ошибок; относительные ссылки на медиа. Мок, расходящийся с контрактом,
 * проверял бы не то, что поедет в прод.
 */
import { createServer } from 'node:http'
import {
  bestPlayersOf,
  competitions,
  games,
  gamesOfPlayer,
  playerById,
  playerCompetitionTotals,
  playerStats,
  players,
  protocolMap,
  publicGame,
  publicPlayer,
  publicTeam,
  roster,
  standingsOf,
  teams,
} from './data.mjs'

const PORT = Number(process.env.PORT ?? 8099)

// ─────────────────────────────────────────── выдача

const teamById = new Map(teams.map(t => [t.id, t]))

/** Конверт Page<T> — только у команд, игроков и соревнований */
function page(items, query) {
  const size = Math.min(200, Math.max(1, Number(query.get('size')) || 50))
  const p = Math.max(1, Number(query.get('page')) || 1)
  return {
    items: items.slice((p - 1) * size, p * size),
    total: items.length,
    page: p,
    size,
  }
}

const norm = s => (s ?? '').toLowerCase().trim()

/** Заявка + статистика игрока в этом соревновании. Порядок: team_id, затем number. */
function competitionPlayers(compId) {
  return roster
    .filter(r => r.competition_id === compId)
    .sort((a, b) => a.team_id - b.team_id || (a.number ?? 999) - (b.number ?? 999))
    .map((r) => {
      const t = playerCompetitionTotals(r.player_id, compId)
      return {
        player: publicPlayer(playerById.get(r.player_id)),
        team_id: r.team_id,
        number: r.number,
        contract: r.contract,
        goals: t.goals,
        assists: t.assists,
        points: t.points,
        penalties: t.penalties,
        games: t.games,
      }
    })
}

/** Команды соревнования с вложенными заявками (без статистики) */
function competitionTeams(compId) {
  const comp = competitions.find(c => c.id === compId)
  if (!comp) return []
  return comp._teams.map(teamId => ({
    team: publicTeam(teamById.get(teamId)),
    players: roster
      .filter(r => r.competition_id === compId && r.team_id === teamId)
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))
      .map(r => ({
        player: publicPlayer(playerById.get(r.player_id)),
        team_id: r.team_id,
        number: r.number,
        contract: r.contract,
      })),
  }))
}

function publicCompetition(c) {
  const { _teams, ...rest } = c
  return rest
}

// ─────────────────────────────────────────── генерация медиа

const LOGO_COLORS = ['#0E7490', '#B45309', '#15803D', '#7E22CE', '#BE123C', '#1D4ED8']

/**
 * Логотип должен читаться на 26px — в таблице и карточках матчей герб именно
 * такой. Первая версия была белым кругом с тонкой обводкой и на этом размере
 * выглядела пустым квадратом, поэтому здесь плотная заливка и крупная звезда.
 */
function teamLogoSvg(id) {
  const c = LOGO_COLORS[id % LOGO_COLORS.length]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <circle cx="60" cy="60" r="60" fill="${c}"/>
  <circle cx="60" cy="60" r="49" fill="none" stroke="#fff" stroke-width="4" opacity=".85"/>
  <path d="M60 24l10.6 22.2L95 49.6 77 66.9l4.7 24.7L60 79.8 38.3 91.6 43 66.9 25 49.6l24.4-3.4z" fill="#fff"/>
</svg>`
}

function playerPhotoSvg(id) {
  const c = LOGO_COLORS[(id * 7) % LOGO_COLORS.length]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="${c}" opacity=".14"/>
  <circle cx="100" cy="78" r="34" fill="${c}" opacity=".55"/>
  <path d="M28 200c0-40 32-62 72-62s72 22 72 62z" fill="${c}" opacity=".55"/>
</svg>`
}

function scanSvg(id) {
  const rows = Array.from({ length: 14 }, (_, i) =>
    `<rect x="60" y="${170 + i * 42}" width="${560 - (i % 3) * 90}" height="10" rx="5" fill="#cbd5e1"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 900" width="700" height="900">
  <rect width="700" height="900" fill="#fff"/>
  <rect x="40" y="40" width="620" height="820" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <text x="350" y="110" font-family="system-ui,sans-serif" font-size="30" font-weight="700"
        fill="#0f172a" text-anchor="middle">ПРОТОКОЛ МАТЧА №${id}</text>
  ${rows}
</svg>`
}

// ─────────────────────────────────────────── маршрутизация

const V1 = '/api/v1'

function handle(pathname, query) {
  // ── служебные
  if (pathname === '/health') return { body: { status: 'ok' } }
  if (pathname === '/') {
    return { body: { service: 'Time Of The Stars API (mock)', version: '2.0.0', docs: '/docs' } }
  }

  // ── медиа: генерируем на лету, чтобы «загруженные» логотипы реально были
  if (pathname.startsWith('/media/')) {
    const file = pathname.slice('/media/'.length)
    let svg = null
    let m
    if ((m = /^team-(\d+)\.svg$/.exec(file))) svg = teamLogoSvg(Number(m[1]))
    else if ((m = /^player-(\d+)\.svg$/.exec(file))) svg = playerPhotoSvg(Number(m[1]))
    else if ((m = /^(?:scan|competition)-(\d+)\.svg$/.exec(file))) svg = scanSvg(Number(m[1]))
    if (!svg) return { status: 404, body: { detail: 'Файл не найден' } }
    return { contentType: 'image/svg+xml; charset=utf-8', raw: svg }
  }

  if (pathname === `${V1}/homepage`) {
    // Флаги ВКЛЮЧЕНЫ: в реальной базе они выключены, и блоки таблицы
    // и сетки на главной иначе не увидеть
    return {
      body: {
        show_standings: true,
        standings_competition_id: 2,
        show_bracket: true,
        bracket_competition_id: 1,
      },
    }
  }

  // ── соревнования
  if (pathname === `${V1}/competitions`) {
    const type = query.get('type')
    if (type && type !== 'championship' && type !== 'tournament') {
      return {
        status: 422,
        body: {
          detail: [{
            type: 'enum',
            loc: ['query', 'type'],
            msg: 'Input should be \'championship\' or \'tournament\'',
            input: type,
          }],
        },
      }
    }
    // Сортировка сервера: start_date ↓, затем id ↓
    const list = competitions
      .filter(c => !type || c.type === type)
      .slice()
      .sort((a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id)
      .map(publicCompetition)
    return { body: page(list, query) }
  }

  let m
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)$`).exec(pathname))) {
    const c = competitions.find(x => x.id === Number(m[1]))
    return c ? { body: publicCompetition(c) } : { status: 404, body: { detail: 'Соревнование не найдено' } }
  }
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)/teams$`).exec(pathname))) {
    return { body: competitionTeams(Number(m[1])) }
  }
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)/players$`).exec(pathname))) {
    return { body: competitionPlayers(Number(m[1])) }
  }
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)/standings$`).exec(pathname))) {
    return {
      body: standingsOf(Number(m[1])).map(r => ({
        team: publicTeam(teamById.get(r.team_id)),
        games: r.games,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        goals_scored: r.goals_scored,
        goals_conceded: r.goals_conceded,
        extra_points: r.extra_points,
        points: r.points,
      })),
    }
  }
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)/best-players$`).exec(pathname))) {
    const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 10))
    return { body: bestPlayersOf(Number(m[1]), limit) }
  }
  if ((m = new RegExp(`^${V1}/competitions/(\\d+)/games$`).exec(pathname))) {
    const id = Number(m[1])
    return { body: games.filter(g => g.competition_id === id).map(publicGame) }
  }

  // ── матчи
  if (pathname === `${V1}/games`) {
    const compId = Number(query.get('competition_id')) || null
    const teamId = Number(query.get('team_id')) || null
    return {
      body: games
        .filter(g => (!compId || g.competition_id === compId)
          && (!teamId || g.team_a_id === teamId || g.team_b_id === teamId))
        .map(publicGame),
    }
  }
  if ((m = new RegExp(`^${V1}/games/(\\d+)$`).exec(pathname))) {
    const g = games.find(x => x.id === Number(m[1]))
    if (!g) return { status: 404, body: { detail: 'Матч не найден' } }
    return {
      body: {
        ...publicGame(g),
        player_stats: (protocolMap.get(g.id) ?? []).map(l => ({
          ...l,
          player: publicPlayer(playerById.get(l.player_id)),
        })),
      },
    }
  }

  // ── команды
  if (pathname === `${V1}/teams`) {
    const search = norm(query.get('search'))
    // search — регистронезависимая подстрока по названию И городу
    const list = teams
      .filter(t => !search || norm(t.name).includes(search) || norm(t.city).includes(search))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map(publicTeam)
    return { body: page(list, query) }
  }
  if ((m = new RegExp(`^${V1}/teams/(\\d+)$`).exec(pathname))) {
    const t = teamById.get(Number(m[1]))
    return t ? { body: publicTeam(t) } : { status: 404, body: { detail: 'Команда не найдена' } }
  }

  // ── игроки
  if (pathname === `${V1}/players`) {
    const search = norm(query.get('search'))
    const list = players
      .filter(p => !search || norm(p.full_name).includes(search))
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'))
      .map(publicPlayer)
    return { body: page(list, query) }
  }
  if ((m = new RegExp(`^${V1}/players/(\\d+)/stats$`).exec(pathname))) {
    const id = Number(m[1])
    if (!playerById.has(id)) return { status: 404, body: { detail: 'Игрок не найден' } }
    return { body: playerStats(id) }
  }
  if ((m = new RegExp(`^${V1}/players/(\\d+)/games$`).exec(pathname))) {
    const id = Number(m[1])
    if (!playerById.has(id)) return { status: 404, body: { detail: 'Игрок не найден' } }
    return { body: gamesOfPlayer(id) }
  }
  if ((m = new RegExp(`^${V1}/players/(\\d+)$`).exec(pathname))) {
    const p = playerById.get(Number(m[1]))
    return p ? { body: publicPlayer(p) } : { status: 404, body: { detail: 'Игрок не найден' } }
  }

  return { status: 404, body: { detail: 'Не найдено' } }
}

// ─────────────────────────────────────────── сервер

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')

  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', '*')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  let out
  try {
    out = handle(url.pathname, url.searchParams)
  }
  catch (e) {
    console.error('[mock] ошибка обработки', url.pathname, e)
    out = { status: 500, body: { detail: 'Внутренняя ошибка сервера', code: 'internal_error' } }
  }

  res.statusCode = out.status ?? 200
  res.setHeader('content-type', out.contentType ?? 'application/json; charset=utf-8')
  res.end(out.raw ?? JSON.stringify(out.body))
}).listen(PORT, () => {
  const played = games.filter(g => g.status === 'finished').length
  const protocolLines = [...protocolMap.values()].reduce((n, l) => n + l.length, 0)
  console.log(`\n  Мок-API лиги на http://localhost:${PORT}\n`)
  console.log(`  соревнований      ${competitions.length}`)
  console.log(`  команд            ${teams.length}`)
  console.log(`  игроков           ${players.length}`)
  console.log(`  заявок в составах ${roster.length}`)
  console.log(`  матчей            ${games.length} (сыграно ${played})`)
  console.log(`  строк протоколов  ${protocolLines}`)
  console.log(`\n  Запустить сайт на моке:  npm run dev:mock\n`)
})
