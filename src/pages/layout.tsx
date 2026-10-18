import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-local'

export function Layout() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <Link to="/" className="font-brand text-2xl font-bold tracking-tight">
          ラーメン<span className="text-(--accent)">図鑑</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>
      <Outlet />
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-text-secondary sm:px-6">
          <p>
            Powered by <Ext href="https://github.com/yusukebe/ramen-api">Ramen API</Ext>
          </p>
          <p>
            写真は <Ext href="https://creativecommons.org/licenses/by-sa/4.0/deed.ja">CC BY-SA 4.0</Ext> で提供されています。撮影者は各写真に表示しています。
          </p>
          <p>
            日本地図: <Ext href="https://github.com/VictorCazanave/svg-maps">SVG Maps</Ext> (CC BY 4.0)
          </p>
        </div>
      </footer>
    </div>
  )
}

export function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="underline underline-offset-2 hover:text-foreground" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}
