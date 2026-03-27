import { useCallback, useState } from 'react'

import { FieldLabel } from '@/components/ui/HelpTip'
import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { usePerMediaState } from '@/features/studio/usePerMediaState'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import { useVideoCompareResult } from '@/features/studio/useVideoCompareResult'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import {
  assertVideoSize,
  ffmpegCleanupInput,
  ffmpegReadOut,
  ffmpegWriteInput,
  FFMPEG_MP4_TAIL,
  getFfmpeg,
  OUT_MP4,
  subscribeFfmpegProgress,
} from '@/lib/video/ffmpegRun'
import type { StudioTool } from '@/lib/search-params'

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

export type StructureToolProps = { tool: StudioTool }

function StructureControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file, activeId, getFileById } = useStudioMedia()
  const { enqueue, progressPct: queueProgress } = useStudioProcessQueue()
  const [startSec, setStartSec] = usePerMediaState(activeId, 0)
  const [durationSec, setDurationSec] = usePerMediaState(activeId, 10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file || !activeId) return
    if (durationSec <= 0 || startSec < 0) {
      setError('Duración y tiempo de inicio deben ser válidos.')
      return
    }
    const fileId = activeId
    const ss = startSec
    const dur = durationSec
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      const blob = await enqueue({
        label: 'Estructura — recorte temporal',
        fileId,
        run: async ({ onProgress }) => {
          const f = getFileById(fileId)
          if (!f) throw new Error('Archivo no encontrado.')
          assertVideoSize(f)
          const ff = await getFfmpeg()
          const unsub = subscribeFfmpegProgress(ff, (ratio01) => {
            onProgress(Math.round(ratio01 * 100))
          })
          try {
            const inName = await ffmpegWriteInput(ff, f)
            const code = await ff.exec([
              '-ss',
              String(ss),
              '-i',
              inName,
              '-t',
              String(dur),
              ...FFMPEG_MP4_TAIL,
              OUT_MP4,
            ])
            await ffmpegCleanupInput(ff, inName)
            if (code !== 0) {
              throw new Error(
                'No se pudo cortar el vídeo. Prueba otros tiempos o un formato distinto.',
              )
            }
            return ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
          } finally {
            unsub()
          }
        },
      })
      onProcessed(blob)
      setHint('Fragmento listo. Revisa la pestaña «Después de procesar».')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [
    file,
    activeId,
    startSec,
    durationSec,
    enqueue,
    getFileById,
    onProcessed,
  ])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Usa el reproductor de arriba para ubicar tiempos; luego define inicio y
        duración del extracto.
      </p>
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="struct-start"
          label="Inicio (s)"
          tip="Segundos desde el comienzo del archivo donde empieza el extracto (seek antes de -i)."
        />
        <input
          id="struct-start"
          type="number"
          min={0}
          step={0.1}
          value={startSec}
          onChange={(e) => setStartSec(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="struct-dur"
          label="Duración (s)"
          tip="Longitud del clip de salida en segundos (-t)."
        />
        <input
          id="struct-dur"
          type="number"
          min={0.1}
          step={0.1}
          value={durationSec}
          onChange={(e) => setDurationSec(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>
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
      <FfmpegProgress busy={busy} progressPct={busy ? queueProgress : null} />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        title="Extrae un fragmento; re-codifica con H.264 según el preset global."
        onClick={() => void run()}
      >
        {busy ? 'En cola / procesando…' : 'Extraer y descargar'}
      </Button>
    </div>
  )
}

export function StructureTool({ tool }: StructureToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Recorte de fragmento por tiempo; exporta un nuevo MP4."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <StructureControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-corte', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
