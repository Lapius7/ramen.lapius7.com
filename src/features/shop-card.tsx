import { Link } from 'react-router'
import { Heart, Soup } from 'lucide-react'
import type { Shop } from '@/lib/api'
import { cn } from '@/lib/utils'

type Props = {
  shop: Shop
  view: 'grid' | 'list'
  fav: boolean
  onToggleFav: () => void
  index?: number
}

export function ShopCard({ shop, view, fav, onToggleFav, index = 0 }: Props) {
  const photo = shop.photos?.[0]
  const count = shop.photos?.length ?? 0
  const list = view === 'list'
  return (
    <li className="group rise relative" style={{ ['--i' as string]: Math.min(index, 12) }}>
      <Link
        to={`/shops/${shop.id}`}
        className={cn(
          'flex w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface text-left',
          'transition-[transform,box-shadow,border-color] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_8px_24px_-12px_oklch(30%_0.05_40/0.25)]',
          'active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)',
          list ? 'flex-row items-stretch' : 'flex-col',
        )}
      >
        <div
          className={cn(
            'relative shrink-0 overflow-hidden bg-surface-muted',
            list ? 'w-32 sm:w-44' : 'aspect-[4/3] w-full',
          )}
        >
          {photo ? (
            <img
              src={photo.url}
              alt={`${shop.name ?? shop.id}のラーメン`}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid size-full place-items-center text-text-muted">
              <Soup className="size-8" aria-hidden />
            </div>
          )}
          {count > 1 && (
            <span className="tnum absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              {count}枚
            </span>
          )}
        </div>
        <div className={cn('flex min-w-0 flex-1 flex-col justify-center gap-1 p-4', list && 'pr-14')}>
          <h3 className="font-brand truncate text-lg leading-tight font-bold">{shop.name ?? shop.id}</h3>
          <p className="text-sm text-text-secondary">{shop.prefecture ?? '所在地未設定'}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onToggleFav}
        aria-pressed={fav}
        aria-label={fav ? `${shop.name}をお気に入りから外す` : `${shop.name}をお気に入りに追加`}
        className={cn(
          'absolute grid size-9 cursor-pointer place-items-center rounded-full backdrop-blur-sm transition-[transform,background-color] duration-150 active:scale-90',
          list ? 'top-1/2 right-3 -translate-y-1/2 active:scale-90' : 'top-2.5 right-2.5',
          fav ? 'bg-(--accent) text-(--accent-foreground)' : 'bg-black/40 text-white hover:bg-black/60',
        )}
      >
        <Heart className={cn('size-4', fav && 'fill-current')} aria-hidden />
      </button>
    </li>
  )
}

export function ShopSkeleton({ view }: { view: 'grid' | 'list' }) {
  return (
    <li
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface',
        view === 'list' ? 'flex h-28' : '',
      )}
    >
      <div className={cn('animate-pulse bg-surface-muted', view === 'list' ? 'w-44' : 'aspect-[4/3]')} />
      <div className="flex-1 space-y-2 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
      </div>
    </li>
  )
}
