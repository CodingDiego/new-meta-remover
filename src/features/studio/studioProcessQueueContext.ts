import { createContext } from 'react'

/** Identifies which tool enqueued a job (for UI + blocking duplicate ops per file). */
export type ProcessJobKind =
  | 'metadata'
  | 'visual'
  | 'color'
  | 'structure'
  | 'audio'
  | 'overlays'
  | 'encode'

export type ProcessJobInfo = {
  jobId: string
  fileId: string
  label: string
  kind: ProcessJobKind
}

export type ProcessJobProgress = {
  /** Snapshot of jobs waiting (FIFO). Excludes the one currently running. */
  queuedJobs: ProcessJobInfo[]
  /** Job currently executing, if any. */
  runningJob: ProcessJobInfo | null
  /** 0–100 while running, null if idle. */
  progressPct: number | null
  /** Last error message from a failed job. */
  lastError: string | null
}

export type EnqueueProcessJobArgs = {
  kind: ProcessJobKind
  label: string
  fileId: string
  /**
   * Run FFmpeg / WASM work. Return the output blob (e.g. MP4) for optional global download.
   */
  run: (ctx: {
    onProgress: (pct: number | null) => void
  }) => Promise<Blob>
}

export type StudioProcessQueueContextValue = ProcessJobProgress & {
  /** @deprecated use `queuedJobs.length` */
  queuedCount: number
  /** @deprecated use `runningJob?.label` */
  runningLabel: string | null
  /** Resolves with the output blob when this job finishes (even if you navigated away). */
  enqueue: (args: EnqueueProcessJobArgs) => Promise<Blob>
  /** Last finished job output (e.g. if you navigated away during encode). */
  lastOutput: {
    jobId: string
    fileId: string
    kind: ProcessJobKind
    label: string
    blob: Blob
    mime: string
  } | null
  dismissLastOutput: () => void
  /** Reorder waiting jobs only (`from`/`to` indices into `queuedJobs`). No-op if invalid. */
  reorderQueuedJobs: (fromIndex: number, toIndex: number) => void
}

export const StudioProcessQueueContext =
  createContext<StudioProcessQueueContextValue | null>(null)
