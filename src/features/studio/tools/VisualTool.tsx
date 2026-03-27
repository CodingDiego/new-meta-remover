import { useCallback, useState } from 'react'

import { FieldLabel, HelpTip } from '@/components/ui/HelpTip'
import { Button } from '@/components/ui/button'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { usePerMediaState } from '@/features/studio/usePerMediaState'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import { useVideoCompareResult } from '@/features/studio/useVideoCompareResult'
import { buildVisualTransformFilter } from '@/lib/video/visualFilters'
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

export type VisualToolProps = { tool: StudioTool }

function VisualControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file, activeId, getFileById } = useStudioMedia()
  const { enqueue, progressPct: queueProgress } = useStudioProcessQueue()
  const [rotationDeg, setRotationDeg] = usePerMediaState(activeId, 0.5)

  const finePresets = [0.05, 0.1, 0.25, 0.5, 1, -0.1, -0.25] as const
  const [flipH, setFlipH] = usePerMediaState(activeId, false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const runTransform = useCallback(async () => {
    if (!file || !activeId) return
    try {
      buildVisualTransformFilter(rotationDeg, flipH)
    } catch (e) {
      setError(formatErr(e))
      return
    }
    const fileId = activeId
    const rot = rotationDeg
    const flip = flipH
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      const blob = await enqueue({
        label: 'Visual — rotación / espejo',
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
            const vff = buildVisualTransformFilter(rot, flip)
            const inName = await ffmpegWriteInput(ff, f)
            const code = await ff.exec([
              '-i',
              inName,
              '-vf',
              vff,
              ...FFMPEG_MP4_TAIL,
              OUT_MP4,
            ])
            await ffmpegCleanupInput(ff, inName)
            if (code !== 0) {
              throw new Error('ffmpeg no pudo aplicar la transformación.')
            }
            return ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
          } finally {
            unsub()
          }
        },
      })
      onProcessed(blob)
      setHint(
        'Listo. Mira la pestaña «Después de procesar» y revisa la descarga.',
      )
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [
    file,
    activeId,
    rotationDeg,
    flipH,
    enqueue,
    getFileById,
    onProcessed,
  ])

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Rotación en grados (valores pequeños apenas se notan). Espejo
        horizontal opcional. El procesamiento sigue en segundo plano si cambias
        de página; el avance aparece abajo a la derecha.
      </p>

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <HelpTip tip="Atajos para ángulos típicos. Los cambios muy pequeños (p. ej. 0,05°) son casi invisibles a simple vista.">
            Ajustes rápidos (°)
          </HelpTip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {finePresets.map((v) => (
            <button
              key={v}
              type="button"
              title={`Fija la rotación a ${v}°`}
              className="cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => setRotationDeg(v)}
            >
              {v}°
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="visual-rotation-deg"
          label="Grados"
          tip="Ángulo en grados sexagesimales (−180 a 180). Usa decimales (paso 0,01) para rotar muy poco. Se convierte a radianes dentro del filtro rotate de FFmpeg."
        />
        <input
          id="visual-rotation-deg"
          type="number"
          min={-180}
          max={180}
          step={0.01}
          value={Number.isNaN(rotationDeg) ? 0 : rotationDeg}
          onChange={(e) => setRotationDeg(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={flipH}
          onChange={(e) => setFlipH(e.target.checked)}
          title="Voltea el vídeo en el eje horizontal (izquierda-derecha)."
        />
        <span className="text-sm text-zinc-800 dark:text-zinc-200">
          Espejo horizontal{' '}
          <span
            className="cursor-help text-zinc-400"
            title="Equivale al filtro hflip: invierte la imagen como en un espejo."
            aria-label="Equivale al filtro hflip: invierte la imagen como en un espejo."
          >
            ⓘ
          </span>
        </span>
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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {hint}
        </p>
      ) : null}
      <FfmpegProgress
        busy={busy}
        progressPct={busy ? queueProgress : null}
      />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        title="Encola un trabajo de FFmpeg (H.264/AAC). Si hay varios trabajos, se ejecutan uno tras otro."
        onClick={() => void runTransform()}
      >
        {busy ? 'En cola / procesando…' : 'Aplicar y descargar MP4'}
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
      description="Rotación por grados (incl. ángulos mínimos) y espejo opcional; revisa el resultado arriba."
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
