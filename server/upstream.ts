import sharp from 'sharp'
import { cached } from './db'
import { PREFECTURES, PREF_SLUG } from '../src/lib/prefectures'

const BASE = 'https://ramen-api.dev'
const HOUR = 3_600_000
const DAY = 24 * HOUR

export type Photo = { name: string; url: string; width: number; height: number; authorId?: string }
export type Shop = { id: string; name?: string; prefecture?: string; photos?: Photo[] }
export type Author = { id: string; name: string; url: string }
export type PhotoMeta = { bytes: number; contentType: string; palette: string[]; brightness: number; warmth: number }

const json = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`upstream ${path} ${res.status}`)
  return res.json() as Promise<T>
}

export const getShops = () =>
  cached('shops', HOUR, async () => {
    const all: Shop[] = []
    let page: number | null = 1
    while (page) {
      const r: { shops: Shop[]; pageInfo: { nextPage: number | null } } = await json(`/shops?page=${page}&perPage=100`)
      all.push(...r.shops)
      page = r.pageInfo.nextPage
    }
    return all
  })

export const getAuthor = (id: string) =>
  cached(`author:${id}`, DAY, async () => {
    const r = await json<{ author: Author }>(`/authors/${encodeURIComponent(id)}`)
    return r.author
  }).then((r) => r.value).catch(() => null)

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

/** 画像を取得し、容量・形式・代表色(5色)・明るさ・暖色度を算出する。 */
export const getPhotoMeta = (url: string) =>
  cached<PhotoMeta>(`photo:${url}`, 30 * DAY, async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`image ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const { data } = await sharp(buf).resize(48, 48, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
    let lum = 0
    let warm = 0
    const px = data.length / 3
    for (let i = 0; i < data.length; i += 3) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      lum += 0.2126 * r + 0.7152 * g + 0.0722 * b
      warm += r - b
      const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
      const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 }
      e.n++, (e.r += r), (e.g += g), (e.b += b)
      buckets.set(k, e)
    }
    const top: { r: number; g: number; b: number }[] = []
    for (const e of [...buckets.values()].sort((a, b) => b.n - a.n)) {
      const c = { r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n) }
      if (top.every((t) => Math.hypot(t.r - c.r, t.g - c.g, t.b - c.b) > 48)) top.push(c)
      if (top.length === 5) break
    }
    return {
      bytes: buf.length,
      contentType: res.headers.get('content-type') ?? 'image/jpeg',
      palette: top.map((c) => hex(c.r, c.g, c.b)),
      brightness: Math.round((lum / px / 255) * 100),
      warmth: Math.round((warm / px / 255) * 100),
    }
  }).then((r) => r.value).catch(() => null)

const nameOf = (s: Shop) => s.name ?? s.id

/** 一覧データから詳細ページ用の派生情報を作る。 */
export async function buildDetail(id: string) {
  const { value: shops, fetchedAt } = await getShops()
  const shop = shops.find((s) => s.id === id)
  if (!shop) return null

  const photos = await Promise.all(
    (shop.photos ?? []).map(async (p) => ({ ...p, meta: await getPhotoMeta(p.url) })),
  )
  const authorIds = [...new Set(photos.map((p) => p.authorId).filter((x): x is string => !!x))]
  const authors = await Promise.all(
    authorIds.map(async (aid) => {
      const a = await getAuthor(aid)
      return {
        id: aid,
        name: a?.name ?? aid,
        url: a?.url ?? `https://github.com/${aid}`,
        avatar: `https://github.com/${encodeURIComponent(aid)}.png?size=96`,
        photoCount: shops.reduce((n, s) => n + (s.photos?.filter((p) => p.authorId === aid).length ?? 0), 0),
        shopCount: shops.filter((s) => s.photos?.some((p) => p.authorId === aid)).length,
      }
    }),
  )

  const light = (s: Shop) => ({ id: s.id, name: nameOf(s), prefecture: s.prefecture, photo: s.photos?.[0]?.url ?? null })
  const byName = (a: Shop, b: Shop) => nameOf(a).localeCompare(nameOf(b), 'ja')

  const counts = new Map<string, number>()
  for (const s of shops) if (s.prefecture) counts.set(s.prefecture, (counts.get(s.prefecture) ?? 0) + 1)
  const ranking = [...counts].sort((a, b) => b[1] - a[1] || PREFECTURES.indexOf(a[0]) - PREFECTURES.indexOf(b[0]))
  const pref = shop.prefecture
  const siblings = pref ? shops.filter((s) => s.prefecture === pref).sort(byName) : []
  const at = siblings.findIndex((s) => s.id === id)

  const totalPhotos = shops.reduce((n, s) => n + (s.photos?.length ?? 0), 0)
  const albumRank = [...shops].sort((a, b) => (b.photos?.length ?? 0) - (a.photos?.length ?? 0)).findIndex((s) => s.id === id) + 1

  return {
    shop: { id: shop.id, name: nameOf(shop), prefecture: pref ?? null, prefectureSlug: pref ? PREF_SLUG[pref] ?? null : null },
    photos,
    authors,
    prefecture: pref
      ? {
          name: pref,
          slug: PREF_SLUG[pref] ?? null,
          shopCount: counts.get(pref) ?? 0,
          rank: ranking.findIndex(([p]) => p === pref) + 1,
          prefCount: ranking.length,
          share: Math.round(((counts.get(pref) ?? 0) / shops.length) * 1000) / 10,
          prev: at > 0 ? light(siblings[at - 1]) : null,
          next: at >= 0 && at < siblings.length - 1 ? light(siblings[at + 1]) : null,
          position: at + 1,
          others: siblings.filter((s) => s.id !== id).slice(0, 8).map(light),
        }
      : null,
    sameAuthor: authorIds.length
      ? shops.filter((s) => s.id !== id && s.photos?.some((p) => p.authorId && authorIds.includes(p.authorId))).slice(0, 8).map(light)
      : [],
    totals: { shops: shops.length, photos: totalPhotos, albumRank },
    source: { api: `${BASE}/shops/${encodeURIComponent(id)}`, license: 'CC BY-SA 4.0', fetchedAt },
  }
}
