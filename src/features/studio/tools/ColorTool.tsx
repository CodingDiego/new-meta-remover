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

export type ColorToolProps = { tool: StudioTool }

function ColorControls() {
  const { file } = useStudioMedia()
  const download = useStudioDownload()
  const [brightness, setBrightness] = useState(0.08)
  const [contrast, setContrast] = useState(1.05)
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
      const vf = `eq=brightness=${brightness}:contrast=${contrast}`
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
      const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
      download(blob, '-color', '.mp4')
      setHint('Listo.')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, brightness, contrast, download])

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Brillo ({brightness.toFixed(2)})
        </span>
        <input
          type="range"
          min={-0.35}
          max={0.35}
          step={0.02}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          className="cursor-pointer"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Contraste ({contrast.toFixed(2)})
        </span>
        <input
          type="range"
          min={0.75}
          max={1.5}
          step={0.02}
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
          className="cursor-pointer"
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
        {busy ? 'Procesando…' : 'Aplicar y descargar'}
      </Button>
    </div>
  )
}

export function ColorTool({ tool }: ColorToolProps) {
  return (
    <StudioVideoShell
      tool={tool}
      description="Ajuste de brillo y contraste (filtro eq) con re-codificación."
    >
      <ColorControls />
    </StudioVideoShell>
  )
}
