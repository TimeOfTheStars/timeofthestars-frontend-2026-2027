export default defineEventHandler((event) => {
  const { public: cfg } = useRuntimeConfig(event)
  const base = (cfg.siteUrl as string).replace(/\/$/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`
})
