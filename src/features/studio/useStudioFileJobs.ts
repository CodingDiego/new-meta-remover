import { useMemo } from 'react'

import type { ProcessJobKind } from '@/features/studio/studioProcessQueueContext'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'

/** True while this tool has a running or queued job for the active file. */
export function useFileJobBlock(
  activeId: string | null,
  kind: ProcessJobKind,
): boolean {
  const { runningJob, queuedJobs } = useStudioProcessQueue()
  return useMemo(() => {
    if (!activeId) return false
    if (runningJob?.fileId === activeId && runningJob.kind === kind) {
      return true
    }
    return queuedJobs.some((j) => j.fileId === activeId && j.kind === kind)
  }, [activeId, kind, runningJob, queuedJobs])
}

/** Progress / queue hints for the active media file (any job kind). */
export function useFileProcessingUi(activeId: string | null) {
  const { runningJob, queuedJobs, progressPct } = useStudioProcessQueue()

  return useMemo(() => {
    const runningThisFile =
      activeId != null && runningJob?.fileId === activeId
    const myQueued =
      activeId != null
        ? queuedJobs.filter((j) => j.fileId === activeId)
        : []

    const showProgressUi = Boolean(
      activeId && (runningThisFile || myQueued.length > 0),
    )
    const barPct = runningThisFile ? progressPct : null
    const headline = runningThisFile
      ? (runningJob?.label ?? 'Procesando…')
      : myQueued.length > 0
        ? `En cola · ${myQueued.length} trabajo${myQueued.length !== 1 ? 's' : ''}`
        : null
    const detail =
      !runningThisFile && myQueued.length > 0
        ? myQueued.map((j) => j.label).join(' → ')
        : null

    const globalPosition =
      activeId != null && myQueued.length > 0
        ? queuedJobs.findIndex((j) => j.fileId === activeId)
        : -1

    return {
      showProgressUi,
      barPct,
      headline,
      detail,
      globalPosition,
      runningThisFile,
    }
  }, [activeId, runningJob, queuedJobs, progressPct])
}
