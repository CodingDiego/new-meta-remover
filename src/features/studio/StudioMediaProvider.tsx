import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { DownloadNameMode } from '@/lib/filename/buildDownloadFilename'
import {
  fileFromPersisted,
  idbConsumeLegacyPersistedFile,
  idbGetProcessingFile,
  idbRemoveProcessingFile,
} from '@/lib/studio/studioMediaIdb'

import {
  StudioMediaContext,
  type StudioMediaItem,
  type StudioMediaContextValue,
} from '@/features/studio/studioMediaContext'

function newId(): string {
  return crypto.randomUUID()
}

export function StudioMediaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StudioMediaItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mediaHydrated, setMediaHydrated] = useState(false)
  const [nameMode, setNameMode] = useState<DownloadNameMode>('preserve')
  const [nameCustomStem, setNameCustomStem] = useState('')
  const [nameSuffix32, setNameSuffix32] = useState(false)

  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const file = useMemo(
    () => items.find((i) => i.id === activeId)?.file ?? null,
    [items, activeId],
  )

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
    void (async () => {
      try {
        const legacy = await idbConsumeLegacyPersistedFile()
        const interrupted = await idbGetProcessingFile()
        const toAdd: File[] = []
        if (legacy) toAdd.push(fileFromPersisted(legacy))
        if (interrupted) {
          toAdd.push(fileFromPersisted(interrupted))
          await idbRemoveProcessingFile()
        }
        if (!cancelled && toAdd.length > 0) {
          const next: StudioMediaItem[] = toAdd.map((f) => ({
            id: newId(),
            file: f,
          }))
          setItems(next)
          setActiveId(next[next.length - 1]!.id)
        }
      } catch (e) {
        console.warn('[studio] Migración / recuperación IDB', e)
      } finally {
        if (!cancelled) setMediaHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const getFileById = useCallback(
    (id: string) => items.find((i) => i.id === id)?.file,
    [items],
  )

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const next: StudioMediaItem[] = files.map((f) => ({
      id: newId(),
      file: f,
    }))
    setItems((prev) => [...prev, ...next])
    setActiveId(next[next.length - 1]!.id)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      setActiveId((cur) => {
        if (cur !== id) return cur
        return next[0]?.id ?? null
      })
      return next
    })
  }, [])

  const setFile = useCallback((f: File | null) => {
    if (!f) {
      const cur = activeIdRef.current
      if (!cur) return
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== cur)
        setActiveId(next[0]?.id ?? null)
        return next
      })
      return
    }
    const id = newId()
    setItems([{ id, file: f }])
    setActiveId(id)
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    setActiveId(null)
  }, [])

  const value = useMemo(
    (): StudioMediaContextValue => ({
      items,
      activeId,
      file,
      previewUrl,
      mediaHydrated,
      addFiles,
      removeItem,
      setActiveId,
      setFile,
      clearAll,
      getFileById,
      nameMode,
      setNameMode,
      nameCustomStem,
      setNameCustomStem,
      nameSuffix32,
      setNameSuffix32,
    }),
    [
      items,
      activeId,
      file,
      previewUrl,
      mediaHydrated,
      addFiles,
      removeItem,
      setActiveId,
      setFile,
      clearAll,
      getFileById,
      nameMode,
      nameCustomStem,
      nameSuffix32,
    ],
  )

  return (
    <StudioMediaContext.Provider value={value}>
      {children}
    </StudioMediaContext.Provider>
  )
}
