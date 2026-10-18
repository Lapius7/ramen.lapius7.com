import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { getShops } from './upstream'

const W = 1200
const H = 630
const DIR = 'data/og'
mkdirSync(DIR, { recursive: true })

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// 1行あたりの全角相当幅で折り返し(最大 maxLines 行)
function wrap(text: string, perLine: number, maxLines: number) {
  const lines: string[] = []
  let cur = ''
  let w = 0
  for (const ch of text) {
    const cw = ch.charCodeAt(0) < 0x250 ? 0.55 : 1
    if (w + cw > perLine) {
      lines.push(cur)
      cur = ''
      w = 0
    }
    cur += ch
    w += cw
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines)
    cut[maxLines - 1] = cut[maxLines - 1].slice(0, -1) + '…'
    return cut
  }
  return lines
}

const FONT = "'Noto Sans CJK JP','Noto Sans JP',sans-serif"

function overlay(title: string, sub: string, photoSide: boolean) {
  const lines = wrap(title, photoSide ? 8.5 : 18, 3)
  const size = lines.length > 2 ? 60 : 72
  const text = lines
    .map((l, i) => `<text x="72" y="${250 + i * (size + 14)}" font-size="${size}" font-weight="700" fill="#2b1d16">${esc(l)}</text>`)
    .join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
<rect width="${W}" height="${H}" fill="#fbf6ea"/>
<rect width="12" height="${H}" fill="#c8402a"/>
<text x="72" y="110" font-size="30" font-weight="700" fill="#c8402a">ラーメン図鑑</text>
${text}
<text x="72" y="${H - 72}" font-size="34" fill="#6b5a4e">${esc(sub)}</text>
<text x="72" y="${H - 30}" font-size="22" fill="#9a8a7c">ramen.lapius7.com · Photos CC BY-SA 4.0</text>
</svg>`)
}

async function photoBuf(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('photo')
  return Buffer.from(await res.arrayBuffer())
}

export async function ogImage(kind: 'shop' | 'pref' | 'home', key: string): Promise<Buffer | null> {
  const file = `${DIR}/${kind}-${key.replace(/[^\w-]/g, '_')}.png`
  if (existsSync(file)) return readFileSync(file)

  const { value: shops } = await getShops()
  let title = 'ラーメン図鑑'
  let sub = `全国${shops.length}店のラーメンを探そう`
  let photo: string | undefined

  if (kind === 'shop') {
    const s = shops.find((x) => x.id === key)
    if (!s) return null
    title = s.name ?? s.id
    sub = `${s.prefecture ?? '所在地不明'} · 写真${s.photos?.length ?? 0}枚`
    photo = s.photos?.[0]?.url
  } else if (kind === 'pref') {
    const list = shops.filter((s) => s.prefecture === key)
    if (!list.length) return null
    title = `${key}のラーメン`
    sub = `${list.length}店を掲載`
    photo = list.find((s) => s.photos?.length)?.photos?.[0]?.url
  } else {
    photo = shops.find((s) => s.photos?.length)?.photos?.[0]?.url
  }

  const base = sharp(overlay(title, sub, !!photo))
  const layers: import("sharp").OverlayOptions[] = []
  if (photo) {
    try {
      const p = await sharp(await photoBuf(photo)).resize(540, H, { fit: 'cover' }).toBuffer()
      layers.push({ input: p, left: W - 540, top: 0 })
    } catch {
      /* 写真なしで続行 */
    }
  }
  const out = await base.composite(layers).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync(file, out)
  return out
}
