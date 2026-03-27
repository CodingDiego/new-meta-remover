import { useContext } from 'react'

import {
  StudioProcessQueueContext,
  type StudioProcessQueueContextValue,
} from '@/features/studio/studioProcessQueueContext'

export function useStudioProcessQueue(): StudioProcessQueueContextValue {
  const ctx = useContext(StudioProcessQueueContext)
  if (!ctx) {
    throw new Error(
      'useStudioProcessQueue debe usarse dentro de StudioProcessQueueProvider',
    )
  }
  return ctx
}
