import { useCallback, useState } from 'react'

import { FieldLabel } from '@/components/ui/HelpTip'
import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
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

export type ColorToolProps = { tool: StudioTool }

function ColorControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file, activeId, getFileById } = useStudioMedia()
  const { enqueue, progressPct: queueProgress } = useStudioProcessQueue()
  const [brightness, setBrightness] = useState(0.08)
  const [contrast, setContrast] = useState(1.05)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file || !activeId) return
    const fileId = activeId
    const b = brightness
    const c = contrast
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      const blob = await enqueue({
        label: 'Color — brillo / contraste',
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
            const vf = `eq=brightness=${b}:contrast=${c},format=yuv420p`
            const code = await ff.exec([
              '-i',
              inName,
              '-vf',
              vf,
              ...FFMPEG_MP4_TAIL,
              OUT_MP4,
            ])
            await ffmpegCleanupInput(ff, inName)
            if (code !== 0) throw new Error('ffmpeg no pudo aplicar el ajuste.')
            return ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
          } finally {
            unsub()
          }
        },
      })
      onProcessed(blob)
      setHint('Listo. Revisa la pestaña «Después de procesar».')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, activeId, brightness, contrast, enqueue, getFileById, onProcessed])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="color-brightness"
          label={`Brillo (${brightness.toFixed(2)})`}
          tip="Filtro eq=brightness en FFmpeg: 0 = sin cambio; negativo oscurece, positivo aclara."
        />
        <input
          id="color-brightness"
          type="range"
          min={-0.35}
          max={0.35}
          step={0.02}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="cursor-pointer"
        />
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="color-contrast"
          label={`Contraste (${contrast.toFixed(2)})`}
          tip="1,0 = sin cambio; &gt;1 aumenta contraste; &lt;1 lo reduce."
        />
        <input
          id="color-contrast"
          type="range"
          min={0.75}
          max={1.5}
          step={0.02}
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
          className="cursor-pointer"
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
        title="Encola un trabajo de FFmpeg con el filtro eq."
        onClick={() => void run()}
      >
        {busy ? 'En cola / procesando…' : 'Aplicar color y descargar'}
      </Button>
    </div>
  )
}

export function ColorTool({ tool }: ColorToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Brillo y contraste con vista previa a pantalla completa antes de exportar."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <ColorControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-color', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
