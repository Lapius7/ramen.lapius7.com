import type { Shop } from './api'
export { PREFECTURES, PREF_ID, PREF_SLUG, prefIndex } from './prefectures'


/** 全角/半角・カタカナ/ひらがな・大文字小文字の違いを吸収する */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, '')
}

export type Indexed = { shop: Shop; hay: string }
export const buildIndex = (shops: Shop[]): Indexed[] =>
  shops.map((shop) => ({ shop, hay: normalize(`${shop.name ?? ''} ${shop.prefecture ?? ''} ${shop.id}`) }))

export function matches(item: Indexed, query: string): boolean {
  const terms = query.normalize('NFKC').split(/\s+/).filter(Boolean).map(normalize)
  return terms.every((t) => item.hay.includes(t))
}


