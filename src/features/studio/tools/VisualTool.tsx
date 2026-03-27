import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useVideoCompareResult } from '@/features/studio/useVideoCompareResult'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import { useFfmpegJobProgress } from '@/features/studio/useFfmpegJobProgress'
import {
  assertVideoSize,
  ffmpegCleanupInput,
  ffmpegReadOut,
  ffmpegWriteInput,
  FFMPEG_MP4_TAIL,
  getFfmpeg,
  OUT_MP4,
} from '@/lib/video/ffmpegRun'
import type { StudioTool } from '@/lib/search-params'

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

export type VisualToolProps = { tool: StudioTool }

function VisualControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file } = useStudioMedia()
  const { progressPct, bindProgress, resetProgress } = useFfmpegJobProgress()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const runFlip = useCallback(async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setHint(null)
    resetProgress()
    try {
      assertVideoSize(file)
      const ff = await getFfmpeg()
      const unsub = bindProgress(ff)
      try {
        const inName = await ffmpegWriteInput(ff, file)
        const code = await ff.exec([
          '-i',
          inName,
          '-vf',
          'hflip',
          ...FFMPEG_MP4_TAIL,
          OUT_MP4,
        ])
        await ffmpegCleanupInput(ff, inName)
        if (code !== 0) throw new Error('ffmpeg no pudo completar el volteo.')
        const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
        onProcessed(blob)
        setHint(
          'Listo. Mira la pestaña «Después de procesar» y revisa la descarga.',
        )
      } finally {
        unsub()
        resetProgress()
      }
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
      resetProgress()
    }
  }, [file, onProcessed, bindProgress, resetProgress])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-600 dark:text-zinc-400">
        Espejo horizontal (re-codifica a H.264/AAC). Compara antes y después
        arriba.
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {hint}
        </p>
      ) : null}
      <FfmpegProgress busy={busy} progressPct={progressPct} />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void runFlip()}
      >
        {busy ? 'Procesando…' : 'Voltear y generar vista previa + descarga'}
      </Button>
    </div>
  )
}

export function VisualTool({ tool }: VisualToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Transformaciones visuales con FFmpeg: revisa el vídeo completo arriba y compara el resultado."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <VisualControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-visual', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
