import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { StudioMediaProvider } from '@/features/studio/StudioMediaProvider'
import { getEnv } from '@/lib/env'
import './index.css'
import { router } from './router'

getEnv()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StudioMediaProvider>
        <RouterProvider router={router} />
      </StudioMediaProvider>
    </QueryClientProvider>
  </StrictMode>,
)
