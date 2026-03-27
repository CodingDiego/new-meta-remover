import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useFfmpegJobProgress } from '@/features/studio/useFfmpegJobProgress'
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
  /** Grados; decimales permiten cambios casi imperceptibles (p. ej. 0,05°). */
  const [rotationDeg, setRotationDeg] = useState(0.5)

  const finePresets = [0.05, 0.1, 0.25, 0.5, 1, -0.1, -0.25] as const
  const [flipH, setFlipH] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const runTransform = useCallback(async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setHint(null)
    resetProgress()
    try {
      let vf: string
      try {
        vf = buildVisualTransformFilter(rotationDeg, flipH)
      } catch (e) {
        setError(formatErr(e))
        setBusy(false)
        return
      }
      assertVideoSize(file)
      const ff = await getFfmpeg()
      const unsub = bindProgress(ff)
      try {
        const inName = await ffmpegWriteInput(ff, file)
        const code = await ff.exec([
          '-i',
          inName,
          '-vf',
          vf,
          ...FFMPEG_MP4_TAIL,
          OUT_MP4,
        ])
        await ffmpegCleanupInput(ff, inName)
        if (code !== 0) {
          throw new Error('ffmpeg no pudo aplicar la transformación.')
        }
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
  }, [file, onProcessed, bindProgress, resetProgress, rotationDeg, flipH])

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Rotación en grados (valores pequeños, p. ej. 0,1°–2°, apenas se notan a
        simple vista). Opcionalmente espejo horizontal. Salida H.264/AAC.
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Ajustes rápidos (°) — cambios casi imperceptibles
        </span>
        <div className="flex flex-wrap gap-1.5">
          {finePresets.map((v) => (
            <button
              key={v}
              type="button"
              className="cursor-pointer rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              onClick={() => setRotationDeg(v)}
            >
              {v}°
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Grados (−180 a 180; usa decimales para rotar muy poco, p. ej. 0,08)
        </span>
        <input
          type="number"
          min={-180}
          max={180}
          step={0.01}
          value={Number.isNaN(rotationDeg) ? 0 : rotationDeg}
          onChange={(e) => setRotationDeg(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={flipH}
          onChange={(e) => setFlipH(e.target.checked)}
        />
        <span className="text-sm text-zinc-800 dark:text-zinc-200">
          Espejo horizontal
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
      <FfmpegProgress busy={busy} progressPct={progressPct} />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void runTransform()}
      >
        {busy ? 'Procesando…' : 'Aplicar y descargar MP4'}
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
