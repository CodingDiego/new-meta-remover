import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { Outlet } from 'react-router-dom'

import { SiteFooter } from '@/components/SiteFooter'

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
      <SiteFooter />
    </div>
  )
}
