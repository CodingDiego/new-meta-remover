import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
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

export type StructureToolProps = { tool: StudioTool }

function StructureControls() {
  const { file } = useStudioMedia()
  const download = useStudioDownload()
  const [startSec, setStartSec] = useState(0)
  const [durationSec, setDurationSec] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file) return
    if (durationSec <= 0 || startSec < 0) {
      setError('Duración y tiempo de inicio deben ser válidos.')
      return
    }
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      assertVideoSize(file)
      const ff = await getFfmpeg()
      const inName = await ffmpegWriteInput(ff, file)
      const code = await ff.exec([
        '-ss',
        String(startSec),
        '-i',
        inName,
        '-t',
        String(durationSec),
        ...FFMPEG_MP4_TAIL,
        OUT_MP4,
      ])
      await ffmpegCleanupInput(ff, inName)
      if (code !== 0) {
        throw new Error(
          'No se pudo cortar el vídeo. Prueba otros tiempos o un formato distinto.',
        )
      }
      const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
      download(blob, '-cut', '.mp4')
      setHint('Fragmento exportado.')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, startSec, durationSec, download])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Extrae un fragmento por tiempo (segundos desde el inicio).
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Inicio (s)
        </span>
        <input
          type="number"
          min={0}
          step={0.1}
          value={startSec}
          onChange={(e) => setStartSec(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Duración (s)
        </span>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={durationSec}
          onChange={(e) => setDurationSec(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{hint}</p>
      ) : null}
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Procesando…' : 'Cortar y descargar'}
      </Button>
    </div>
  )
}

export function StructureTool({ tool }: StructureToolProps) {
  return (
    <StudioVideoShell
      tool={tool}
      description="Recorte por tiempo (extracto). Re-codifica a MP4."
    >
      <StructureControls />
    </StudioVideoShell>
  )
}
