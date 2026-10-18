import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { compress } from 'hono/compress'
import { existsSync, readFileSync } from 'node:fs'
import { ogImage } from './og'
import { PREF_ID } from '../src/lib/prefectures'
import { buildDetail, getShops } from './upstream'

const app = new Hono()
const api = new Hono()

api.use('*', compress())
api.get('/shops', async (c) => {
  try {
    const { value, fetchedAt } = await getShops()
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
    return c.json({ shops: value, fetchedAt })
  } catch {
    return c.json({ error: 'ラーメンAPIに接続できませんでした' }, 502)
  }
})
api.get('/shops/:id', async (c) => {
  try {
    const d = await buildDetail(c.req.param('id'))
    if (!d) return c.json({ error: 'not found' }, 404)
    c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
    return c.json(d)
  } catch {
    return c.json({ error: 'ラーメンAPIに接続できませんでした' }, 502)
  }
})
api.get('/health', (c) => c.json({ ok: true }))
app.route('/api', api)

const SITE = process.env.SITE_URL ?? 'https://ramen.lapius7.com'

// 自動生成 OGP 画像 (data/og にキャッシュ)
const png = (buf: Buffer | null | undefined, c: import('hono').Context) => {
  if (!buf) return c.notFound()
  c.header('Content-Type', 'image/png')
  c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  return c.body(new Uint8Array(buf))
}
app.get('/og/home.png', async (c) => png(await ogImage('home', 'home').catch(() => null), c))
app.get('/og/shops/:id{.+\\.png}', async (c) => png(await ogImage('shop', c.req.param('id').replace(/\.png$/, '')).catch(() => null), c))
app.get('/og/prefectures/:slug{.+\\.png}', async (c) => {
  const name = PREF_ID[c.req.param('slug').replace(/\.png$/, '')]
  return png(name ? await ogImage('pref', name).catch(() => null) : null, c)
})

// 本番: ビルド済み SPA を配信し、未知のパスは メタタグを差し込んだ index.html にフォールバック
if (existsSync('dist')) {
  const html = readFileSync('dist/index.html', 'utf8')
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
  const page = async (path: string) => {
    let title = 'ラーメン図鑑 | 今日の一杯を探そう'
    let desc = '全国のラーメン店を、地図・都道府県・写真から探せる図鑑。'
    let image = '/og/home.png'
    let status: 200 | 404 = 200
    let m: RegExpMatchArray | null
    if ((m = path.match(/^\/shops\/([^/]+)$/))) {
      const id = decodeURIComponent(m[1])
      const shop = (await getShops().catch(() => null))?.value.find((s) => s.id === id)
      if (shop) {
        title = `${shop.name ?? shop.id}(${shop.prefecture ?? '所在地不明'}) | ラーメン図鑑`
        desc = `${shop.name ?? shop.id}の写真${shop.photos?.length ?? 0}枚と詳細データ。`
        image = `/og/shops/${encodeURIComponent(id)}.png`
      } else status = 404
    } else if ((m = path.match(/^\/prefectures\/([^/]+)$/))) {
      const name = PREF_ID[m[1]]
      if (name) {
        title = `${name}のラーメン店 | ラーメン図鑑`
        desc = `${name}のラーメン店一覧。`
        image = `/og/prefectures/${m[1]}.png`
      } else status = 404
    }
    const url = SITE + path
    const tags = [
      `<meta name="description" content="${esc(desc)}" />`,
      `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="ラーメン図鑑" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta property="og:image" content="${esc(SITE + image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:locale" content="ja_JP" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ].join('\n    ')
    return { status, body: html.replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>\n    ${tags}`) }
  }
  app.use('/assets/*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  })
  app.use('*', serveStatic({ root: './dist', rewriteRequestPath: (p) => (p === '/' ? '/__none__' : p) }))
  app.get('*', async (c) => {
    const { status, body } = await page(new URL(c.req.url).pathname)
    return c.html(body, status)
  })
}

const port = Number(process.env.PORT ?? 8791)
console.log(`listening on :${port}`)
export default { port, fetch: app.fetch }
