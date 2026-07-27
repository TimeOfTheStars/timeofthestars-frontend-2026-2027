import type { Competition, Page, Player, Team } from '#shared/types/api'
import { ep } from '#shared/utils/endpoints'

/**
 * Карта сайта. Написана руками вместо модуля: это ~50 строк, а ещё одна
 * зависимость на маленьком сайте — лишняя (та же логика, что с шрифтами
 * и иконками).
 *
 * Динамические адреса собираются из API на момент запроса. Если API недоступен,
 * отдаём хотя бы статические разделы, а не 500: карта сайта не должна ронять
 * выдачу.
 */
export default defineEventHandler(async (event) => {
  const { public: cfg } = useRuntimeConfig(event)
  const base = (cfg.siteUrl as string).replace(/\/$/, '')
  const api = cfg.apiBase as string

  const urls: { loc: string; priority: string }[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/competitions', priority: '0.8' },
    { loc: '/games', priority: '0.8' },
    { loc: '/teams', priority: '0.7' },
    { loc: '/players', priority: '0.5' },
  ]

  const get = <T>(path: string, query?: Record<string, unknown>) =>
    $fetch<T>(`${api}${path}`, { query, timeout: 5000 })

  try {
    const [competitions, teams] = await Promise.all([
      get<Page<Competition>>(ep.competitions, { page: 1, size: 200 }),
      get<Page<Team>>(ep.teams, { page: 1, size: 200 }),
    ])

    for (const c of competitions.items) {
      urls.push({ loc: `/competitions/${c.id}`, priority: '0.9' })
    }
    for (const t of teams.items) {
      // Канонический адрес — со slug, как в интерфейсе
      urls.push({ loc: `/teams/${t.slug}-${t.id}`, priority: '0.6' })
    }

    // Игроков может быть много (в живой базе — 500+): берём первые страницы
    const first = await get<Page<Player>>(ep.players, { page: 1, size: 200 })
    const pages = Math.min(Math.ceil(first.total / 200), 5)
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        get<Page<Player>>(ep.players, { page: i + 2, size: 200 })),
    )
    for (const p of [first, ...rest].flatMap(x => x.items)) {
      urls.push({ loc: `/players/${p.id}`, priority: '0.4' })
    }
  }
  catch {
    // API недоступен — отдаём статические разделы
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${base}${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`
})
