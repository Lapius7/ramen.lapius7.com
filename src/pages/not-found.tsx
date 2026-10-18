import { useEffect } from 'react'
import { Link } from 'react-router'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'ページが見つかりません | ラーメン図鑑'
  }, [])
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center">
      <SearchX className="size-8 text-text-muted" />
      <h1 className="font-brand text-2xl font-bold">ページが見つかりません</h1>
      <p className="text-sm text-text-secondary">URLが変わったか、削除された可能性があります。</p>
      <Button render={<Link to="/" />} nativeButton={false}>
        トップへ戻る
      </Button>
    </main>
  )
}
