import { createContext } from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'

export type StudioMediaContextValue = {
  file: File | null
  setFile: (f: File | null) => void
  previewUrl: string | null
  /** Filename for downloads */
  nameMode: DownloadNameMode
  setNameMode: (m: DownloadNameMode) => void
  nameSuffix32: boolean
  setNameSuffix32: (v: boolean) => void
}

export const StudioMediaContext = createContext<StudioMediaContextValue | null>(
  null,
)
