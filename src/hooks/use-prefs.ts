import { useCallback, useState } from 'react'

export type Prefs = {
  q: string
  sort: 'kana' | 'pref' | 'photos'
  view: 'grid' | 'list'
  fav: boolean
  multi: boolean
}
const DEFAULT: Prefs = { q: '', sort: 'kana', view: 'grid', fav: false, multi: false }
const KEY = 'ramen:prefs'

// 一覧の表示設定。URLには載せず、ページ遷移後も保持する。
let memory: Prefs = (() => {
  try {
    return { ...DEFAULT, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT
  }
})()

export function usePrefs() {
  const [prefs, set] = useState<Prefs>(memory)
  const update = useCallback((patch: Partial<Prefs>) => {
    memory = { ...memory, ...patch }
    sessionStorage.setItem(KEY, JSON.stringify(memory))
    set(memory)
  }, [])
  return [prefs, update] as const
}
