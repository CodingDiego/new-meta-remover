import { useCallback, useState } from 'react'

import type { FFmpeg } from '@ffmpeg/ffmpeg'

import { subscribeFfmpegProgress } from '@/lib/video/ffmpegRun'

/**
 * State + binder for a single FFmpeg `exec` job (one subscribe per run).
 */
export function useFfmpegJobProgress() {
  const [progressPct, setProgressPct] = useState<number | null>(null)

  const resetProgress = useCallback(() => {
    setProgressPct(null)
  }, [])

  /** Call right after `getFfmpeg()`. Unsubscribe in `finally` after `exec`. */
  const bindProgress = useCallback((ff: FFmpeg) => {
    return subscribeFfmpegProgress(ff, (ratio01) => {
      setProgressPct(Math.round(ratio01 * 100))
    })
  }, [])

  return { progressPct, bindProgress, resetProgress }
}
