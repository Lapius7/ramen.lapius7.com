import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Dices, Heart, Images, Map as MapIcon, SearchX, TriangleAlert } from 'lucide-react'
import { SearchField } from '@/components/arc/search-field/search-field'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Button } from '@/components/ui/button'
import { JapanMap } from '@/features/japan-map'
import { ShopCard, ShopSkeleton } from '@/features/shop-card'
import { useFavorites } from '@/hooks/use-local'
import { usePrefs } from '@/hooks/use-prefs'
import { useShops } from '@/hooks/use-shops'
import type { Shop } from '@/lib/api'
import { matches, PREF_ID, PREF_SLUG, prefIndex } from '@/lib/search'
import { cn } from '@/lib/utils'
import { NotFoundPage } from './not-found'

export function Home() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const pref = slug ? PREF_ID[slug] ?? null : ''
  const [state, update] = usePrefs()
  const { shops, index, error, retry } = useShops()
  const favs = useFavorites()
  const [mapOpen, setMapOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = pref ? `${pref}のラーメン店 | ラーメン図鑑` : 'ラーメン図鑑 | 今日の一杯を探そう'
  }, [pref])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const goPref = (name: string) => navigate(name ? `/prefectures/${PREF_SLUG[name]}` : '/')

  const prefCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const { shop } of index) if (shop.prefecture) m.set(shop.prefecture, (m.get(shop.prefecture) ?? 0) + 1)
    return [...m].sort((a, b) => prefIndex(a[0]) - prefIndex(b[0]))
  }, [index])

  const pass = (s: Shop) => (!state.fav || favs.has(s.id)) && (!state.multi || (s.photos?.length ?? 0) >= 2)

  const mapCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of index) {
      const s = i.shop
      if (s.prefecture && matches(i, state.q) && pass(s)) m.set(s.prefecture, (m.get(s.prefecture) ?? 0) + 1)
    }
    return m
  }, [index, state.q, state.fav, state.multi, favs.ids]) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const name = (s: Shop) => s.name ?? s.id
    return index
      .filter((i) => matches(i, state.q))
      .map((i) => i.shop)
      .filter((s) => !pref || s.prefecture === pref)
      .filter(pass)
      .sort((a, b) => {
        if (state.sort === 'pref') return prefIndex(a.prefecture) - prefIndex(b.prefecture) || name(a).localeCompare(name(b), 'ja')
        if (state.sort === 'photos') return (b.photos?.length ?? 0) - (a.photos?.length ?? 0) || name(a).localeCompare(name(b), 'ja')
        return name(a).localeCompare(name(b), 'ja')
      })
  }, [index, state, pref, favs.ids]) // eslint-disable-line react-hooks/exhaustive-deps

  if (pref === null) return <NotFoundPage />

  const random = () => {
    const pool = visible.length ? visible : shops ?? []
    if (pool.length) navigate(`/shops/${pool[Math.floor(Math.random() * pool.length)].id}`)
  }
  const filtering = !!(state.q || pref || state.fav || state.multi)
  const reset = () => {
    update({ q: '', fav: false, multi: false })
    if (pref) navigate('/')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <section className="py-8 sm:py-12">
        <h1 className="font-brand text-[1.75rem] leading-[1.15] font-bold text-balance sm:text-5xl">
          {pref ? `${pref}のラーメン` : '今日の一杯を、探そう。'}
        </h1>
        <p className="mt-3 max-w-prose text-text-secondary">店名や都道府県で絞り込めます。気になる店は、ハートで保存できます。</p>
        <div className="mt-6 max-w-xl">
          <SearchField
            ref={searchRef}
            label="店名・都道府県で検索"
            value={state.q}
            onValueChange={(q) => update({ q })}
            placeholder="例: 札幌、らーめん、東京"
          />
          <p className="mt-2 hidden text-xs text-text-muted sm:block">
            <kbd className="rounded border border-border-strong px-1">/</kbd> で検索欄に移動
          </p>
        </div>
      </section>

      <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={mapOpen} onClick={() => setMapOpen((o) => !o)}>
            <MapIcon className="size-4" />
            {mapOpen ? '地図を閉じる' : '地図から探す'}
          </Button>
          <div className={cn('mt-3 rounded-2xl border border-border bg-surface p-4 lg:mt-0 lg:block', !mapOpen && 'hidden')}>
            <JapanMap counts={mapCounts} selected={pref} onSelect={goPref} />
          </div>
        </aside>

        <div className="min-w-0">
          <nav aria-label="都道府県" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {[['', shops?.length ?? 0] as const, ...prefCounts].map(([p, n]) => (
              <Link
                key={p || 'all'}
                to={p ? `/prefectures/${PREF_SLUG[p]}` : '/'}
                aria-current={pref === p ? 'page' : undefined}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-95',
                  pref === p ? 'border-transparent bg-(--accent) text-(--accent-foreground)' : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                {p || 'すべて'} <span className="tnum opacity-70">{n}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="tnum text-sm text-text-secondary" aria-live="polite">
              {shops ? `${visible.length}件` : '読み込み中'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="並び順"
                value={state.sort}
                onValueChange={(sort) => update({ sort: sort as typeof state.sort })}
                options={[
                  { value: 'kana', label: '名前' },
                  { value: 'pref', label: '地域' },
                  { value: 'photos', label: '写真数' },
                ]}
              />
              <SegmentedControl
                label="表示"
                value={state.view}
                onValueChange={(view) => update({ view: view as typeof state.view })}
                options={[
                  { value: 'grid', label: 'グリッド' },
                  { value: 'list', label: 'リスト' },
                ]}
              />
              <Button variant={state.fav ? 'default' : 'outline'} size="sm" aria-pressed={state.fav} onClick={() => update({ fav: !state.fav })}>
                <Heart className={cn('size-4', state.fav && 'fill-current')} />
                <span className="tnum">{favs.ids.length}</span>
              </Button>
              <Button variant={state.multi ? 'default' : 'outline'} size="sm" aria-pressed={state.multi} onClick={() => update({ multi: !state.multi })}>
                <Images className="size-4" />
                写真2枚以上
              </Button>
              <Button variant="outline" size="sm" onClick={random} disabled={!shops}>
                <Dices className="size-4" />
                おまかせ
              </Button>
            </div>
          </div>

          <div className="mt-5">
            {error ? (
              <Notice icon={<TriangleAlert className="size-6" />} title="読み込めませんでした" body={error}>
                <Button onClick={retry}>もう一度試す</Button>
              </Notice>
            ) : !shops ? (
              <ul className={listClass(state.view)} aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <ShopSkeleton key={i} view={state.view} />
                ))}
              </ul>
            ) : visible.length === 0 ? (
              <Notice
                icon={<SearchX className="size-6" />}
                title={state.fav && !filtering ? 'お気に入りはまだありません' : '見つかりませんでした'}
                body="条件を変えるか、解除してもう一度探してみてください。"
              >
                {filtering && (
                  <Button variant="outline" onClick={reset}>
                    条件をクリア
                  </Button>
                )}
              </Notice>
            ) : (
              <ul className={listClass(state.view)}>
                {visible.map((s, i) => (
                  <ShopCard key={s.id} index={i} shop={s} view={state.view} fav={favs.has(s.id)} onToggleFav={() => favs.toggle(s.id)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const listClass = (view: 'grid' | 'list') =>
  view === 'grid'
    ? 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4'
    : 'grid grid-cols-[minmax(0,1fr)] gap-3'

export function Notice({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center">
      <div className="text-text-muted">{icon}</div>
      <h2 className="font-brand text-xl font-bold">{title}</h2>
      <p className="max-w-sm text-sm text-text-secondary">{body}</p>
      {children}
    </div>
  )
}
