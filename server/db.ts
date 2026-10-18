import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'

mkdirSync('data', { recursive: true })
export const db = new Database(process.env.DB_PATH ?? 'data/ramen.db', { create: true })
db.run('PRAGMA journal_mode = WAL')
db.run(`CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
)`)

const get = db.query<{ json: string; fetched_at: number }, [string]>('SELECT json, fetched_at FROM cache WHERE key = ?')
const put = db.query('INSERT INTO cache (key, json, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at')

const inflight = new Map<string, Promise<unknown>>()

/** SQLite に保存した値を返す。期限切れなら再取得し、失敗したら古い値を返す(stale-if-error)。 */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<{ value: T; fetchedAt: number }> {
  const hit = get.get(key)
  const now = Date.now()
  if (hit && now - hit.fetched_at < ttlMs) return { value: JSON.parse(hit.json), fetchedAt: hit.fetched_at }
  let p = inflight.get(key) as Promise<T> | undefined
  if (!p) {
    p = load().finally(() => inflight.delete(key))
    inflight.set(key, p)
  }
  try {
    const value = await p
    put.run(key, JSON.stringify(value), now)
    return { value, fetchedAt: now }
  } catch (e) {
    if (hit) return { value: JSON.parse(hit.json), fetchedAt: hit.fetched_at }
    throw e
  }
}
