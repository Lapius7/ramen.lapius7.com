# ラーメン図鑑

全国のラーメン店を、日本地図・都道府県・写真から探せる図鑑です。店ごとの詳細ページ、自動生成の OGP 画像、お気に入り機能があります。

https://ramen.lapius7.com

Powered by [Ramen API](https://github.com/yusukebe/ramen-api)(データ: CC BY-SA 4.0、写真の作者は各店のページに表示)。

## 構成

- フロント: Vite + React + TypeScript + Tailwind CSS
- サーバー: Hono (Bun)、SQLite(`bun:sqlite`)で API 応答をキャッシュ、sharp で OGP 画像とアイコンを生成

## 開発

```sh
pnpm install
pnpm dev                        # フロント (http://localhost:5173)
PORT=8791 bun server/index.ts   # API (/api は 8791 へプロキシ)
```

## 本番

```sh
pnpm build
PORT=3340 SITE_URL=https://ramen.lapius7.com NODE_ENV=production bun server/index.ts
```

`dist/index.html` は起動時に一度だけ読み込むので、ビルドし直したらサーバーを再起動してください。
OGP の日本語描画には Noto Sans CJK JP が必要です。キャッシュは `data/` に保存されます。

アイコンの再生成: `bun scripts/icons.ts`
