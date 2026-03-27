import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'

import {
  StudioMediaContext,
  type StudioMediaContextValue,
} from '@/features/studio/studioMediaContext'

export function StudioMediaProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(null)
  const [nameMode, setNameMode] = useState<DownloadNameMode>('preserve')
  const [nameSuffix32, setNameSuffix32] = useState(false)

  const previewUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const setFile = useCallback((f: File | null) => {
    setFileState(f)
  }, [])

  const value = useMemo(
    (): StudioMediaContextValue => ({
      file,
      setFile,
      previewUrl,
      nameMode,
      setNameMode,
      nameSuffix32,
      setNameSuffix32,
    }),
    [
      file,
      setFile,
      previewUrl,
      nameMode,
      nameSuffix32,
    ],
  )

  return (
    <StudioMediaContext.Provider value={value}>
      {children}
    </StudioMediaContext.Provider>
  )
}
