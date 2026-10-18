import { Route, Routes } from 'react-router'
import { ShopsProvider } from '@/hooks/use-shops'
import { Home } from '@/pages/home'
import { Layout } from '@/pages/layout'
import { NotFoundPage } from '@/pages/not-found'
import { ShopPage } from '@/pages/shop'

export default function App() {
  return (
    <ShopsProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="prefectures/:slug" element={<Home />} />
          <Route path="shops/:id" element={<ShopPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ShopsProvider>
  )
}
