import { createContext } from 'react'

export type ProcessJobProgress = {
  /** Queued jobs ahead of the running one (not including running). */
  queuedCount: number
  /** Currently running job label, if any. */
  runningLabel: string | null
  /** 0–100 while running, null if idle. */
  progressPct: number | null
  /** Last error message from a failed job. */
  lastError: string | null
}

export type EnqueueProcessJobArgs = {
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
  /** Resolves with the output blob when this job finishes (even if you navigated away). */
  enqueue: (args: EnqueueProcessJobArgs) => Promise<Blob>
  /** Last finished job output (e.g. if you navigated away during encode). */
  lastOutput: { label: string; blob: Blob; mime: string } | null
  dismissLastOutput: () => void
}

export const StudioProcessQueueContext =
  createContext<StudioProcessQueueContextValue | null>(null)
