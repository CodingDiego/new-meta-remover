import { useContext } from 'react'

import {
  StudioMediaContext,
  type StudioMediaContextValue,
} from '@/features/studio/studioMediaContext'

export function useStudioMedia(): StudioMediaContextValue {
  const ctx = useContext(StudioMediaContext)
  if (!ctx) {
    throw new Error('useStudioMedia debe usarse dentro de StudioMediaProvider')
  }
  return ctx
}
