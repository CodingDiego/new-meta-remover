import { useCallback, useState } from 'react'

import { FieldLabel } from '@/components/ui/HelpTip'
import { Button } from '@/components/ui/button'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import { useVideoCompareResult } from '@/features/studio/useVideoCompareResult'
import {
  assertVideoSize,
  FFMPEG_X264_CRF_DEFAULT,
  FFMPEG_X264_PRESET_DEFAULT,
  ffmpegCleanupInput,
  ffmpegReadOut,
  ffmpegWriteInput,
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

export type EncodeToolProps = { tool: StudioTool }

function EncodeControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file, activeId, getFileById } = useStudioMedia()
  const { enqueue, progressPct: queueProgress } = useStudioProcessQueue()
  const [crf, setCrf] = useState(Number(FFMPEG_X264_CRF_DEFAULT))
  const [preset, setPreset] = useState<string>(FFMPEG_X264_PRESET_DEFAULT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file || !activeId) return
    const fileId = activeId
    const p = preset
    const c = crf
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      const blob = await enqueue({
        label: 'Codificar — H.264 / AAC',
        fileId,
        run: async ({ onProgress }) => {
          const f = getFileById(fileId)
          if (!f) throw new Error('Archivo no encontrado.')
          assertVideoSize(f)
          const ff = await getFfmpeg()
          const unsub = subscribeFfmpegProgress(ff, (ratio01) => {
            onProgress(Math.round(ratio01 * 100))
          })
          let inName = ''
          try {
            inName = await ffmpegWriteInput(ff, f)
            const code = await ff.exec([
              '-i',
              inName,
              '-c:v',
              'libx264',
              '-preset',
              p,
              '-crf',
              String(c),
              '-pix_fmt',
              'yuv420p',
              '-profile:v',
              'main',
              '-threads',
              '0',
              '-c:a',
              'aac',
              '-b:a',
              '128k',
              '-ar',
              '48000',
              '-movflags',
              '+faststart',
              OUT_MP4,
            ])
            if (code !== 0) throw new Error('ffmpeg no pudo re-codificar.')
            return ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
          } finally {
            if (inName) await ffmpegCleanupInput(ff, inName).catch(() => {})
            unsub()
          }
        },
      })
      onProcessed(blob)
      setHint('Exportación lista. Compara calidad en la pestaña resultado.')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, activeId, crf, preset, enqueue, getFileById, onProcessed])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Re-codifica a MP4 (H.264 + AAC). El proceso puede seguir en segundo
        plano; la barra inferior muestra el avance.
      </p>
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="encode-crf"
          label={`CRF (${crf})`}
          tip="Constant Rate Factor (libx264): valores más bajos = mejor calidad y tamaño mayor; más altos = más rápido y más compresión. Rango típico 18–28."
        />
        <input
          id="encode-crf"
          type="range"
          min={18}
          max={32}
          step={1}
          value={crf}
          onChange={(e) => setCrf(Number(e.target.value))}
          className="cursor-pointer"
        />
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel
          htmlFor="encode-preset"
          label="Preset x264"
          tip="Velocidad de codificación: ultrafast/veryfast terminan antes en wasm; slow/veryslow comprimen más pero tardan mucho más."
        />
        <select
          id="encode-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="ultrafast">ultrafast (más rápido, peor compresión)</option>
          <option value="superfast">superfast</option>
          <option value="veryfast">veryfast (recomendado en wasm)</option>
          <option value="faster">faster</option>
          <option value="fast">fast</option>
          <option value="medium">medium</option>
          <option value="slow">slow</option>
        </select>
      </div>
      <FfmpegProgress
        busy={busy}
        progressPct={busy ? queueProgress : null}
      />
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
        title="Encola un trabajo de re-codificación. Varios trabajos se ejecutan en orden."
        onClick={() => void run()}
      >
        {busy ? 'En cola / codificando…' : 'Re-codificar y descargar'}
      </Button>
    </div>
  )
}

export function EncodeTool({ tool }: EncodeToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Control fino de exportación; la vista previa muestra el archivo de entrada completo."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <EncodeControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-encode', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
