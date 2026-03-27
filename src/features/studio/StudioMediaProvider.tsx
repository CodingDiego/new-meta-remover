import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'
import {
  fileFromPersisted,
  idbGetStudioFile,
  idbPutStudioFile,
  idbRemoveStudioFile,
} from '@/lib/studio/studioMediaIdb'

import {
  StudioMediaContext,
  type StudioMediaContextValue,
} from '@/features/studio/studioMediaContext'

export function StudioMediaProvider({ children }: { children: ReactNode }) {
  const [file, setFileState] = useState<File | null>(null)
  const [mediaHydrated, setMediaHydrated] = useState(false)
  /** True only after the initial IndexedDB read finishes (StrictMode-safe). */
  const readyToPersist = useRef(false)
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

  useEffect(() => {
    let cancelled = false
    readyToPersist.current = false
    void (async () => {
      try {
        const rec = await idbGetStudioFile()
        if (!cancelled && rec) {
          setFileState(fileFromPersisted(rec))
        }
      } catch (e) {
        console.warn('[studio] No se pudo restaurar el archivo guardado', e)
      } finally {
        if (!cancelled) {
          readyToPersist.current = true
          setMediaHydrated(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persistFile = useEffectEvent(async () => {
    try {
      if (!file) {
        await idbRemoveStudioFile()
        return
      }
      await idbPutStudioFile(file)
    } catch (e) {
      console.warn('[studio] No se pudo guardar el archivo en IndexedDB', e)
    }
  })

  useEffect(() => {
    if (!mediaHydrated || !readyToPersist.current) return
    void persistFile()
  }, [file, mediaHydrated])

  const setFile = useCallback((f: File | null) => {
    setFileState(f)
  }, [])

  const value = useMemo(
    (): StudioMediaContextValue => ({
      file,
      setFile,
      previewUrl,
      mediaHydrated,
      nameMode,
      setNameMode,
      nameSuffix32,
      setNameSuffix32,
    }),
    [
      file,
      setFile,
      previewUrl,
      mediaHydrated,
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
