export type Photo = { name: string; url: string; width: number; height: number; authorId?: string }
export type Shop = { id: string; name?: string; prefecture?: string; photos?: Photo[] }

export type PhotoMeta = { bytes: number; contentType: string; palette: string[]; brightness: number; warmth: number }
export type Brief = { id: string; name: string; prefecture?: string; photo: string | null }
export type Detail = {
  shop: { id: string; name: string; prefecture: string | null; prefectureSlug: string | null }
  photos: (Photo & { meta: PhotoMeta | null })[]
  authors: { id: string; name: string; url: string; avatar: string; photoCount: number; shopCount: number }[]
  prefecture: {
    name: string
    slug: string | null
    shopCount: number
    rank: number
    prefCount: number
    share: number
    prev: Brief | null
    next: Brief | null
    position: number
    others: Brief[]
  } | null
  sameAuthor: Brief[]
  totals: { shops: number; photos: number; albumRank: number }
  source: { api: string; license: string; fetchedAt: number }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, { signal })
  if (res.status === 404) throw new NotFound()
  if (!res.ok) throw new Error(`データの取得に失敗しました (${res.status})`)
  return res.json()
}

export class NotFound extends Error {}
export const fetchShops = (signal?: AbortSignal) => get<{ shops: Shop[]; fetchedAt: number }>('/shops', signal)
export const fetchDetail = (id: string, signal?: AbortSignal) => get<Detail>(`/shops/${encodeURIComponent(id)}`, signal)
