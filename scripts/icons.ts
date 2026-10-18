// public/favicon.svg から PNG / ICO / manifest を生成する: bun scripts/icons.ts
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg')
const png = (size: number) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()

writeFileSync('public/apple-touch-icon.png', await png(180))
writeFileSync('public/icon-192.png', await png(192))
writeFileSync('public/icon-512.png', await png(512))

// PNG 埋め込み形式の ICO (16/32/48)
const sizes = [16, 32, 48]
const imgs = await Promise.all(sizes.map(png))
const head = Buffer.alloc(6 + 16 * sizes.length)
head.writeUInt16LE(1, 2)
head.writeUInt16LE(sizes.length, 4)
let offset = head.length
imgs.forEach((b, i) => {
  const o = 6 + 16 * i
  head[o] = sizes[i]
  head[o + 1] = sizes[i]
  head.writeUInt16LE(1, o + 4)
  head.writeUInt16LE(32, o + 6)
  head.writeUInt32LE(b.length, o + 8)
  head.writeUInt32LE(offset, o + 12)
  offset += b.length
})
writeFileSync('public/favicon.ico', Buffer.concat([head, ...imgs]))

writeFileSync(
  'public/site.webmanifest',
  JSON.stringify(
    {
      name: 'ラーメン図鑑',
      short_name: 'ラーメン図鑑',
      lang: 'ja',
      start_url: '/',
      display: 'standalone',
      background_color: '#fbf6ea',
      theme_color: '#c8402a',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  ),
)
console.log('icons generated')
