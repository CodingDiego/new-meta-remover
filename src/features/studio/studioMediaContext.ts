import { createContext } from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'

/** Session asset: file + download naming options (unique per item). */
export type StudioMediaItem = {
  id: string
  file: File
  nameMode: DownloadNameMode
  nameCustomStem: string
  nameSuffix32: boolean
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
  /** Download naming for the active asset (defaults when none selected). */
  nameMode: DownloadNameMode
  setNameMode: (m: DownloadNameMode) => void
  /** Raw input when nameMode is `custom` (Metadatos UI); stored on the active item. */
  nameCustomStem: string
  setNameCustomStem: (s: string) => void
  nameSuffix32: boolean
  setNameSuffix32: (v: boolean) => void
}

export const StudioMediaContext = createContext<StudioMediaContextValue | null>(
  null,
)
