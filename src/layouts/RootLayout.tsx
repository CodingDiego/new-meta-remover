import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { Outlet } from 'react-router-dom'

export function RootLayout() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}
