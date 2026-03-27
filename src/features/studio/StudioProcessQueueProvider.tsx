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
  type ProcessJobInfo,
  type StudioProcessQueueContextValue,
} from '@/features/studio/studioProcessQueueContext'
import { useStudioMedia } from '@/features/studio/useStudioMedia'

type Queued = EnqueueProcessJobArgs & {
  jobId: string
  resolve: (blob: Blob) => void
  reject: (e: unknown) => void
}

function toInfo(j: Queued): ProcessJobInfo {
  return {
    jobId: j.jobId,
    fileId: j.fileId,
    label: j.label,
    kind: j.kind,
  }
}

export function StudioProcessQueueProvider({
  children,
}: {
  children: ReactNode
}) {
  const { getFileById } = useStudioMedia()
  const queueRef = useRef<Queued[]>([])
  const drainingRef = useRef(false)

  const [queuedJobs, setQueuedJobs] = useState<ProcessJobInfo[]>([])
  const [runningJob, setRunningJob] = useState<ProcessJobInfo | null>(null)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<{
    jobId: string
    fileId: string
    kind: EnqueueProcessJobArgs['kind']
    label: string
    blob: Blob
    mime: string
  } | null>(null)

  const syncQueuedFromRef = useCallback(() => {
    setQueuedJobs(queueRef.current.map(toInfo))
  }, [])

  const drain = useCallback(async () => {
    if (drainingRef.current) return
    drainingRef.current = true
    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift()!
        syncQueuedFromRef()
        const info = toInfo(job)
        const file = getFileById(job.fileId)
        if (!file) {
          const err = new Error(
            'Archivo no encontrado (¿lo quitaste de la lista?)',
          )
          setLastError(err.message)
          job.reject(err)
          continue
        }
        setRunningJob(info)
        setProgressPct(0)
        setLastError(null)
        await idbPutProcessingFile(file)
        try {
          const blob = await job.run({
            onProgress: (p) => setProgressPct(p),
          })
          const mime = blob.type || 'application/octet-stream'
          setLastOutput({
            jobId: job.jobId,
            fileId: job.fileId,
            kind: job.kind,
            label: job.label,
            blob,
            mime,
          })
          job.resolve(blob)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setLastError(msg)
          job.reject(e)
        } finally {
          await idbRemoveProcessingFile()
          setProgressPct(null)
          setRunningJob(null)
        }
      }
    } finally {
      drainingRef.current = false
      syncQueuedFromRef()
    }
  }, [getFileById, syncQueuedFromRef])

  const enqueue = useCallback(
    (args: EnqueueProcessJobArgs) => {
      return new Promise<Blob>((resolve, reject) => {
        const jobId = crypto.randomUUID()
        queueRef.current.push({ ...args, jobId, resolve, reject })
        syncQueuedFromRef()
        void drain()
      })
    },
    [drain, syncQueuedFromRef],
  )

  const reorderQueuedJobs = useCallback(
    (fromIndex: number, toIndex: number) => {
      const q = queueRef.current
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= q.length ||
        toIndex >= q.length
      ) {
        return
      }
      const [removed] = q.splice(fromIndex, 1)
      q.splice(toIndex, 0, removed)
      syncQueuedFromRef()
    },
    [syncQueuedFromRef],
  )

  const dismissLastOutput = useCallback(() => setLastOutput(null), [])

  const value = useMemo(
    (): StudioProcessQueueContextValue => ({
      queuedJobs,
      runningJob,
      progressPct,
      lastError,
      queuedCount: queuedJobs.length,
      runningLabel: runningJob?.label ?? null,
      enqueue,
      lastOutput,
      dismissLastOutput,
      reorderQueuedJobs,
    }),
    [
      queuedJobs,
      runningJob,
      progressPct,
      lastError,
      enqueue,
      lastOutput,
      dismissLastOutput,
      reorderQueuedJobs,
    ],
  )

  return (
    <StudioProcessQueueContext.Provider value={value}>
      {children}
    </StudioProcessQueueContext.Provider>
  )
}
