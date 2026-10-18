import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchShops, type Shop } from '@/lib/api'
import { buildIndex, type Indexed } from '@/lib/search'

type Ctx = { shops: Shop[] | null; index: Indexed[]; error: string | null; retry: () => void }
const ShopsCtx = createContext<Ctx>({ shops: null, index: [], error: null, retry: () => {} })

export function ShopsProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    fetchShops(ac.signal)
      .then((r) => (setError(null), setShops(r.shops)))
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
    return () => ac.abort()
  }, [attempt])

  const index = useMemo(() => buildIndex(shops ?? []), [shops])
  const value = useMemo(() => ({ shops, index, error, retry: () => setAttempt((n) => n + 1) }), [shops, index, error])
  return <ShopsCtx value={value}>{children}</ShopsCtx>
}

export const useShops = () => use(ShopsCtx)
