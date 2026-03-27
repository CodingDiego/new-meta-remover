import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioMedia } from '@/features/studio/StudioMediaContext'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
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

function VisualControls() {
  const { file } = useStudioMedia()
  const download = useStudioDownload()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const runFlip = useCallback(async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      assertVideoSize(file)
      const ff = await getFfmpeg()
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
      download(blob, '-visual', '.mp4')
      setHint('Listo. Revisa la carpeta de descargas.')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, download])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-600 dark:text-zinc-400">
        Espejo horizontal del vídeo (re-codifica a H.264/AAC).
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
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void runFlip()}
      >
        {busy ? 'Procesando…' : 'Voltear horizontalmente y descargar'}
      </Button>
    </div>
  )
}

export function VisualTool({ tool }: VisualToolProps) {
  return (
    <StudioVideoShell
      tool={tool}
      description="Transformaciones visuales básicas con FFmpeg en el navegador."
    >
      <VisualControls />
    </StudioVideoShell>
  )
}
