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

const MUTE_VIDEO_ARGS = [
  '-an',
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '23',
  '-movflags',
  '+faststart',
] as const
import type { StudioTool } from '@/lib/search-params'

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

export type AudioToolProps = { tool: StudioTool }

function AudioControls() {
  const { file } = useStudioMedia()
  const download = useStudioDownload()
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
    try {
      assertVideoSize(file)
      const ff = await getFfmpeg()
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
      download(blob, '-audio', '.mp4')
      setHint('Listo.')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, mute, volume, download])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        Silencia la pista o cambia el volumen (re-codifica el vídeo).
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
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Procesando…' : 'Aplicar y descargar'}
      </Button>
    </div>
  )
}

export function AudioTool({ tool }: AudioToolProps) {
  return (
    <StudioVideoShell
      tool={tool}
      description="Control básico de volumen o silencio de la pista de audio."
    >
      <AudioControls />
    </StudioVideoShell>
  )
}
