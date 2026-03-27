import { createContext } from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'

export type StudioMediaItem = {
  id: string
  file: File
}

export type StudioMediaContextValue = {
  items: StudioMediaItem[]
  activeId: string | null
  /** Active file for tools (derived). */
  file: File | null
  previewUrl: string | null
  mediaHydrated: boolean
  addFiles: (files: File[]) => void
  removeItem: (id: string) => void
  setActiveId: (id: string | null) => void
  /**
   * Replace session with a single file (single-file pickers / compat).
   * Passing null removes the active item (or clears if none).
   */
  setFile: (f: File | null) => void
  clearAll: () => void
  getFileById: (id: string) => File | undefined
  nameMode: DownloadNameMode
  setNameMode: (m: DownloadNameMode) => void
  nameSuffix32: boolean
  setNameSuffix32: (v: boolean) => void
}

export const StudioMediaContext = createContext<StudioMediaContextValue | null>(
  null,
)
