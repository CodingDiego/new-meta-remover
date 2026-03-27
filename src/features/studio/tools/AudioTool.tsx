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

/** Mute path: video-only re-encode using same defaults as `FFMPEG_MP4_TAIL`. */
const MUTE_VIDEO_ARGS = ['-an', ...FFMPEG_MP4_TAIL] as const

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

export type AudioToolProps = { tool: StudioTool }

function AudioControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file } = useStudioMedia()
  const { progressPct, bindProgress, resetProgress } = useFfmpegJobProgress()
  const [mute, setMute] = useState(false)
  const [volume, setVolume] = useState(1)
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
      try {
        const inName = await ffmpegWriteInput(ff, file)
        const code = await ff.exec(
          mute
            ? ['-i', inName, ...MUTE_VIDEO_ARGS, OUT_MP4]
            : [
                '-i',
                inName,
                '-af',
                `volume=${volume}`,
                ...FFMPEG_MP4_TAIL,
                OUT_MP4,
              ],
        )
        await ffmpegCleanupInput(ff, inName)
        if (code !== 0) throw new Error('ffmpeg no pudo ajustar el audio.')
        const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
        onProcessed(blob)
        setHint('Listo. Comprueba el resultado en la otra pestaña.')
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
  }, [file, mute, volume, onProcessed, bindProgress, resetProgress])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Escucha el original arriba; tras procesar, cambia a «Después de
        procesar» para validar audio.
      </p>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={mute}
          onChange={(e) => setMute(e.target.checked)}
        />
        <span className="text-sm">Sin audio (eliminar pista)</span>
      </label>
      {!mute ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Volumen ({volume.toFixed(2)}×)
          </span>
          <input
            type="range"
            min={0.1}
            max={2.5}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="cursor-pointer"
          />
        </label>
      ) : null}
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
      <FfmpegProgress busy={busy} progressPct={progressPct} />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Procesando…' : 'Aplicar audio y descargar'}
      </Button>
    </div>
  )
}

export function AudioTool({ tool }: AudioToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Volumen o silencio. El vídeo de arriba muestra el archivo completo; compara tras exportar."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <AudioControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-audio', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
