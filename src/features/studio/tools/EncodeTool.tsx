import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { FfmpegProgress } from '@/features/studio/FfmpegProgress'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useFfmpegJobProgress } from '@/features/studio/useFfmpegJobProgress'
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
  const { file } = useStudioMedia()
  const { progressPct, bindProgress, resetProgress } = useFfmpegJobProgress()
  const [crf, setCrf] = useState(Number(FFMPEG_X264_CRF_DEFAULT))
  const [preset, setPreset] = useState<string>(FFMPEG_X264_PRESET_DEFAULT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setHint(null)
    resetProgress()
    try {
      assertVideoSize(file)
      const ff = await getFfmpeg()
      const unsub = bindProgress(ff)
      let inName = ''
      try {
        inName = await ffmpegWriteInput(ff, file)
        const code = await ff.exec([
          '-i',
          inName,
          '-c:v',
          'libx264',
          '-preset',
          preset,
          '-crf',
          String(crf),
          '-threads',
          '0',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          OUT_MP4,
        ])
        if (code !== 0) throw new Error('ffmpeg no pudo re-codificar.')
        const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
        onProcessed(blob)
        setHint('Exportación lista. Compara calidad en la pestaña resultado.')
      } finally {
        if (inName) await ffmpegCleanupInput(ff, inName).catch(() => {})
        unsub()
        resetProgress()
      }
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
      resetProgress()
    }
  }, [file, crf, preset, onProcessed, bindProgress, resetProgress])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Re-codifica a MP4 (H.264 + AAC). Por defecto usa preset rápido y CRF más
        alto que un export “cine” para acortar tiempo en el navegador. CRF más
        bajo = mejor calidad, más lento.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          CRF ({crf})
        </span>
        <input
          type="range"
          min={18}
          max={32}
          step={1}
          value={crf}
          onChange={(e) => setCrf(Number(e.target.value))}
          className="cursor-pointer"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Presets
        </span>
        <select
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
      </label>
      <FfmpegProgress busy={busy} progressPct={progressPct} />
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
        {busy ? 'Codificando…' : 'Re-codificar y descargar'}
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
