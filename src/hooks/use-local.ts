import { useCallback, useEffect, useState } from 'react'

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ramen:fav') ?? '[]')
    } catch {
      return []
    }
  })
  useEffect(() => {
    localStorage.setItem('ramen:fav', JSON.stringify(ids))
  }, [ids])
  const toggle = useCallback(
    (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])),
    [],
  )
  return { ids, has: (id: string) => ids.includes(id), toggle }
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('ramen:theme') as 'light' | 'dark' | null) ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('ramen:theme', theme)
  }, [theme])
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}
