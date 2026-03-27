import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  idbPutProcessingFile,
  idbRemoveProcessingFile,
} from '@/lib/studio/studioMediaIdb'

import {
  StudioProcessQueueContext,
  type EnqueueProcessJobArgs,
  type StudioProcessQueueContextValue,
} from '@/features/studio/studioProcessQueueContext'
import { useStudioMedia } from '@/features/studio/useStudioMedia'

type Queued = EnqueueProcessJobArgs & {
  resolve: (blob: Blob) => void
  reject: (e: unknown) => void
}

export function StudioProcessQueueProvider({
  children,
}: {
  children: ReactNode
}) {
  const { getFileById } = useStudioMedia()
  const queueRef = useRef<Queued[]>([])
  const drainingRef = useRef(false)

  const [queuedCount, setQueuedCount] = useState(0)
  const [runningLabel, setRunningLabel] = useState<string | null>(null)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<{
    label: string
    blob: Blob
    mime: string
  } | null>(null)

  const drain = useCallback(async () => {
    if (drainingRef.current) return
    drainingRef.current = true
    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift()!
        setQueuedCount(queueRef.current.length)
        const file = getFileById(job.fileId)
        if (!file) {
          const err = new Error('Archivo no encontrado (¿lo quitaste de la lista?)')
          setLastError(err.message)
          job.reject(err)
          continue
        }
        setRunningLabel(job.label)
        setProgressPct(0)
        setLastError(null)
        await idbPutProcessingFile(file)
        try {
          const blob = await job.run({
            onProgress: (p) => setProgressPct(p),
          })
          const mime = blob.type || 'application/octet-stream'
          setLastOutput({ label: job.label, blob, mime })
          job.resolve(blob)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setLastError(msg)
          job.reject(e)
        } finally {
          await idbRemoveProcessingFile()
          setProgressPct(null)
          setRunningLabel(null)
        }
      }
    } finally {
      drainingRef.current = false
      setQueuedCount(queueRef.current.length)
    }
  }, [getFileById])

  const enqueue = useCallback(
    (args: EnqueueProcessJobArgs) => {
      return new Promise<Blob>((resolve, reject) => {
        queueRef.current.push({ ...args, resolve, reject })
        setQueuedCount(queueRef.current.length)
        void drain()
      })
    },
    [drain],
  )

  const dismissLastOutput = useCallback(() => setLastOutput(null), [])

  const value = useMemo(
    (): StudioProcessQueueContextValue => ({
      queuedCount,
      runningLabel,
      progressPct,
      lastError,
      enqueue,
      lastOutput,
      dismissLastOutput,
    }),
    [
      queuedCount,
      runningLabel,
      progressPct,
      lastError,
      enqueue,
      lastOutput,
      dismissLastOutput,
    ],
  )

  return (
    <StudioProcessQueueContext.Provider value={value}>
      {children}
    </StudioProcessQueueContext.Provider>
  )
}
