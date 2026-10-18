import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, ExternalLink, Heart, MapPin, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { JapanMap } from '@/features/japan-map'
import { useFavorites } from '@/hooks/use-local'
import { fetchDetail, NotFound, type Brief, type Detail } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Ext } from './layout'
import { Notice } from './home'
import { NotFoundPage } from './not-found'

type State = { id: string; detail?: Detail; error?: string; missing?: boolean }

const fmtBytes = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`)
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

export function ShopPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const favs = useFavorites()
  const [state, setState] = useState<State>({ id })
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    fetchDetail(id, ac.signal)
      .then((detail) => setState({ id, detail }))
      .catch((e) => {
        if (ac.signal.aborted) return
        setState({ id, ...(e instanceof NotFound ? { missing: true } : { error: (e as Error).message }) })
      })
    return () => ac.abort()
  }, [id, tick])

  const loaded = state.id === id ? state : { id }
  const d = loaded.detail

  useEffect(() => {
    setActive(0)
  }, [id])

  useEffect(() => {
    if (d) document.title = `${d.shop.name}(${d.shop.prefecture ?? '所在地不明'}) | ラーメン図鑑`
  }, [d])

  useEffect(() => {
    if (!d) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return
      const to = e.key === 'ArrowLeft' ? d.prefecture?.prev : e.key === 'ArrowRight' ? d.prefecture?.next : null
      if (to) navigate(`/shops/${to.id}`)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [d, navigate])

  const mapCounts = useMemo(() => new Map(d?.shop.prefecture ? [[d.shop.prefecture, d.prefecture?.shopCount ?? 1]] : []), [d])

  if (loaded.missing) return <NotFoundPage />
  if (loaded.error)
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Notice icon={<TriangleAlert className="size-6" />} title="読み込めませんでした" body={loaded.error}>
          <Button onClick={() => setTick((t) => t + 1)}>もう一度試す</Button>
        </Notice>
      </main>
    )
  if (!d) return <DetailSkeleton />

  const { shop, photos, authors, prefecture: pref, totals } = d
  const photo = photos[Math.min(active, photos.length - 1)]
  const author = photo && authors.find((a) => a.id === photo.authorId)
  const url = typeof location !== 'undefined' ? location.href : ''
  const copy = async () => {
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const prefHref = pref?.slug ? `/prefectures/${pref.slug}` : '/'

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <nav aria-label="パンくず" className="flex flex-wrap items-center gap-1 py-6 text-sm text-text-secondary">
        <Link className="hover:text-foreground" to="/">
          ホーム
        </Link>
        {pref && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link className="hover:text-foreground" to={prefHref}>
              {pref.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" aria-hidden />
        <span aria-current="page" className="min-w-0 truncate text-foreground">
          {shop.name}
        </span>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <section aria-label="写真">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted">
            {photo ? (
              <img
                key={photo.url}
                src={photo.url}
                alt={`${shop.name}のラーメン`}
                width={photo.width}
                height={photo.height}
                className="rise max-h-[34rem] w-full object-cover"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-text-muted">写真はありません</div>
            )}
          </div>
          {photos.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <li key={p.url} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`写真 ${i + 1}`}
                    aria-current={i === active}
                    className={cn('size-16 overflow-hidden rounded-lg border-2 transition-[border-color,transform] active:scale-95', i === active ? 'border-(--accent)' : 'border-transparent')}
                  >
                    <img src={p.url} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {author && (
            <p className="mt-3 text-sm text-text-secondary">
              撮影: <Ext href={author.url}>{author.name}</Ext>(CC BY-SA 4.0)
            </p>
          )}
        </section>

        <section>
          <h1 className="font-brand text-3xl leading-tight font-bold text-balance [overflow-wrap:anywhere] sm:text-4xl">{shop.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-text-secondary">
            <MapPin className="size-4" aria-hidden />
            {pref ? <Link className="underline underline-offset-2" to={prefHref}>{pref.name}</Link> : '所在地不明'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant={favs.has(shop.id) ? 'default' : 'outline'} aria-pressed={favs.has(shop.id)} onClick={() => favs.toggle(shop.id)}>
              <Heart className={cn('size-4', favs.has(shop.id) && 'fill-current')} />
              {favs.has(shop.id) ? '保存済み' : '保存する'}
            </Button>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'コピーしました' : 'リンクをコピー'}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name} ${shop.prefecture ?? ''}`)}`} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-4" />
              地図で探す
            </Button>
          </div>

          <h2 className="mt-8 font-brand text-xl font-bold">基本情報</h2>
          <dl className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
            <Row k="店舗ID" v={<code>{shop.id}</code>} />
            <Row k="都道府県" v={pref?.name ?? '—'} />
            <Row k="写真" v={`${photos.length}枚`} />
            <Row k="撮影者" v={authors.length ? authors.map((a) => a.name).join('、') : '—'} />
            {pref && <Row k="県内の掲載順" v={`${pref.position} / ${pref.shopCount}`} />}
            <Row k="全店舗での写真数順位" v={`${totals.albumRank} / ${totals.shops}位`} />
          </dl>

          {pref && (
            <div className="mt-8">
              <h2 className="font-brand text-xl font-bold">{pref.name}の中で</h2>
              <div className="mt-3 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                <JapanMap counts={mapCounts} selected={shop.prefecture ?? ""} onSelect={() => navigate(prefHref)} />
                <ul className="tnum space-y-1.5 text-sm text-text-secondary">
                  <li>掲載 <b className="text-foreground">{pref.shopCount}</b> 店</li>
                  <li>都道府県別 <b className="text-foreground">{pref.rank}</b> / {pref.prefCount} 位</li>
                  <li>全体の <b className="text-foreground">{pref.share.toFixed(1)}%</b></li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      {photos.length > 0 && (
        <section className="mt-12" aria-labelledby="photo-data">
          <h2 id="photo-data" className="font-brand text-xl font-bold">写真のデータ</h2>
          <p className="mt-1 text-sm text-text-secondary">画像そのものから算出した値です。</p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="tnum w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  {['', 'ファイル', 'サイズ', '比率', '画素数', '容量', '形式', '代表色', '明るさ', '暖かさ'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {photos.map((p, i) => {
                  const g = gcd(p.width, p.height)
                  return (
                    <tr key={p.url} className={i === active ? 'bg-surface-muted' : undefined}>
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 break-all">{p.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.width}×{p.height}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.width / g}:{p.height / g}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{((p.width * p.height) / 1e6).toFixed(2)} MP</td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.meta ? fmtBytes(p.meta.bytes) : '—'}</td>
                      <td className="px-3 py-2">{p.meta?.contentType.replace('image/', '') ?? '—'}</td>
                      <td className="px-3 py-2">
                        {p.meta ? (
                          <ul className="flex gap-1">
                            {p.meta.palette.map((c) => (
                              <li key={c} title={c} className="size-5 rounded-full border border-border" style={{ background: c }}>
                                <span className="sr-only">{c}</span>
                              </li>
                            ))}
                          </ul>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">{p.meta ? `${p.meta.brightness}%` : '—'}</td>
                      <td className="px-3 py-2">{p.meta ? `${p.meta.warmth}%` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {authors.length > 0 && (
        <section className="mt-12">
          <h2 className="font-brand text-xl font-bold">撮影者</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
            {authors.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                <img src={a.avatar} alt="" width={48} height={48} className="size-12 rounded-full" loading="lazy" />
                <div className="min-w-0">
                  <a href={a.url} target="_blank" rel="noreferrer" className="block truncate font-medium underline-offset-2 hover:underline">{a.name}</a>
                  <p className="tnum text-sm text-text-secondary">写真 {a.photoCount}枚 / {a.shopCount}店</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pref && (pref.prev || pref.next) && (
        <nav aria-label="同じ都道府県の前後の店" className="mt-12 grid grid-cols-2 gap-3">
          {pref.prev ? <Step b={pref.prev} dir="prev" /> : <span />}
          {pref.next ? <Step b={pref.next} dir="next" /> : <span />}
        </nav>
      )}

      {pref && pref.others.length > 0 && <Related title={`${pref.name}のほかの店`} items={pref.others} />}
      {d.sameAuthor.length > 0 && <Related title="同じ撮影者の店" items={d.sameAuthor} />}

      <section className="mt-12 rounded-2xl border border-border bg-surface-muted p-4 text-sm text-text-secondary">
        <h2 className="font-medium text-foreground">データの出典</h2>
        <p className="mt-1">
          <Ext href={d.source.api}>Ramen API</Ext>({d.source.license})。取得: {new Date(d.source.fetchedAt).toLocaleString('ja-JP')}。キーボードの ← → で前後の店に移動できます。
        </p>
      </section>
    </main>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 px-4 py-2.5">
      <dt className="text-text-secondary">{k}</dt>
      <dd className="tnum min-w-0 [overflow-wrap:anywhere]">{v}</dd>
    </div>
  )
}

function Step({ b, dir }: { b: Brief; dir: 'prev' | 'next' }) {
  return (
    <Link
      to={`/shops/${b.id}`}
      className={cn('flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-surface p-3 transition-[border-color,transform] hover:border-border-strong active:scale-[0.98]', dir === 'next' && 'flex-row-reverse text-right')}
    >
      {dir === 'prev' ? <ArrowLeft className="size-4 shrink-0" aria-hidden /> : <ArrowRight className="size-4 shrink-0" aria-hidden />}
      <span className="min-w-0">
        <span className="block text-xs text-text-muted">{dir === 'prev' ? '前の店' : '次の店'}</span>
        <span className="block truncate font-medium">{b.name}</span>
      </span>
    </Link>
  )
}

function Related({ title, items }: { title: string; items: Brief[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-brand text-xl font-bold">{title}</h2>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-3">
        {items.map((b) => (
          <li key={b.id}>
            <Link to={`/shops/${b.id}`} className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-transform active:scale-[0.98]">
              <div className="aspect-[4/3] bg-surface-muted">
                {b.photo && <img src={b.photo} alt="" loading="lazy" className="size-full object-cover" />}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-medium">{b.name}</p>
                <p className="truncate text-xs text-text-secondary">{b.prefecture ?? '—'}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
