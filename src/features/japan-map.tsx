import { useState } from 'react'
import japan from '@svg-maps/japan'
import { PREF_ID } from '@/lib/search'

type Props = {
  counts: Map<string, number>
  selected: string
  onSelect: (pref: string) => void
  className?: string
}

/** マットな質感の日本地図。店のある県だけ塗り、件数が多いほど濃くなる。 */
export function JapanMap({ counts, selected, onSelect, className }: Props) {
  const [hover, setHover] = useState<string>('')
  const max = Math.max(1, ...counts.values())
  const active = hover || selected
  const activeName = active ? PREF_ID[active] : ''

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg viewBox={japan.viewBox} role="group" aria-label="日本地図で都道府県を選ぶ" className="h-auto w-full select-none">
        <defs>
          <filter id="matte" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.35" result="grain" />
            <feComposite in="grain" in2="SourceAlpha" operator="in" result="g" />
            <feComponentTransfer in="g" result="g2"><feFuncA type="linear" slope="0.22" /></feComponentTransfer>
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="g2" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#matte)">
          {(japan.locations as { id: string; path: string }[]).map((l) => {
            const name = PREF_ID[l.id]
            const n = counts.get(name) ?? 0
            const on = n > 0
            const isSel = selected === name
            const isHover = hover === l.id
            const fill = isSel || isHover
              ? 'var(--accent)'
              : on
                ? `color-mix(in oklch, var(--accent) ${28 + Math.round((n / max) * 50)}%, var(--map-base))`
                : 'var(--map-base)'
            return (
              <path
                key={l.id}
                d={l.path}
                fill={fill}
                stroke="var(--background)"
                strokeWidth={isSel ? 1.6 : 1}
                strokeLinejoin="round"
                className="pointer-events-none transition-[fill] duration-200"
              />
            )
          })}
        </g>
        {/* 押しやすさのため、店のある県だけ太い透明の当たり判定を重ねる */}
        {(japan.locations as { id: string; path: string }[]).map((l) => {
          const name = PREF_ID[l.id]
          const n = counts.get(name) ?? 0
          if (n === 0) return null
          const isSel = selected === name
          return (
            <path
              key={l.id}
              d={l.path}
              fill="transparent"
              stroke="transparent"
              strokeWidth={16}
              strokeLinejoin="round"
              tabIndex={0}
              role="button"
              aria-label={`${name} ${n}件`}
              aria-pressed={isSel}
              onClick={() => onSelect(isSel ? '' : name)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(isSel ? '' : name))}
              onPointerEnter={() => setHover(l.id)}
              onPointerLeave={() => setHover('')}
              onFocus={() => setHover(l.id)}
              onBlur={() => setHover('')}
              style={{ pointerEvents: 'all' }}
              className="cursor-pointer outline-none"
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-1 left-1 min-h-12" aria-live="polite">
        {activeName ? (
          <p className="font-brand text-xl font-bold">
            {activeName}
            <span className="tnum ml-2 font-sans text-sm font-normal text-text-secondary">{counts.get(activeName)}件</span>
          </p>
        ) : (
          <p className="text-sm text-text-muted">色のついた県を選んでください</p>
        )}
      </div>
    </div>
  )
}
