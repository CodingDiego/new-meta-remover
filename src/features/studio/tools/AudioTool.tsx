import { useCallback, useState } from 'react'

import {
  useFileJobBlock,
  useFileProcessingUi,
} from '@/features/studio/useStudioFileJobs'
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
  const { file, activeId, getFileById } = useStudioMedia()
  const { enqueue } = useStudioProcessQueue()
  const jobBlocked = useFileJobBlock(activeId, 'audio')
  const jobUi = useFileProcessingUi(activeId)
  const [mute, setMute] = usePerMediaState(activeId, false)
  const [volume, setVolume] = usePerMediaState(activeId, 1)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file || !activeId) return
    const fileId = activeId
    const m = mute
    const vol = volume
    setError(null)
    setHint(null)
    try {
      const blob = await enqueue({
        kind: 'audio',
        label: m ? 'Audio — silenciar' : 'Audio — volumen',
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
            const code = await ff.exec(
              m
                ? ['-i', inName, ...MUTE_VIDEO_ARGS, OUT_MP4]
                : [
                    '-i',
                    inName,
                    '-af',
                    `volume=${vol}`,
                    ...FFMPEG_MP4_TAIL,
                    OUT_MP4,
                  ],
            )
            await ffmpegCleanupInput(ff, inName)
            if (code !== 0) throw new Error('ffmpeg no pudo ajustar el audio.')
            return ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
          } finally {
            unsub()
          }
        },
      })
      onProcessed(blob)
      setHint('Listo. Comprueba el resultado en la otra pestaña.')
    } catch (e) {
      setError(formatErr(e))
    }
  }, [file, activeId, mute, volume, enqueue, getFileById, onProcessed])

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
          title="Elimina la pista de audio (-an) y re-codifica vídeo."
        />
        <span className="text-sm">
          Sin audio (eliminar pista){' '}
          <span
            className="cursor-help text-zinc-400"
            title="No es lo mismo que volumen 0: aquí no hay pista de audio en el contenedor."
            aria-label="No es lo mismo que volumen 0"
          >
            ⓘ
          </span>
        </span>
      </label>
      {!mute ? (
        <div className="flex flex-col gap-1">
          <FieldLabel
            htmlFor="audio-vol"
            label={`Volumen (${volume.toFixed(2)}×)`}
            tip="Filtro volume de FFmpeg: 1,0 = nivel original; 2,0 ≈ el doble de amplitud."
          />
          <input
            id="audio-vol"
            type="range"
            min={0.1}
            max={2.5}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="cursor-pointer"
          />
        </div>
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
      <FfmpegProgress
        active={jobUi.showProgressUi}
        progressPct={jobUi.barPct}
        headline={jobUi.headline}
        detail={jobUi.runningThisFile ? null : jobUi.detail ?? undefined}
        queuePosition={
          !jobUi.runningThisFile && jobUi.globalPosition >= 0
            ? jobUi.globalPosition
            : undefined
        }
      />
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={jobBlocked}
        title="Aplica filtros de audio y re-codifica el vídeo."
        onClick={() => void run()}
      >
        {jobBlocked ? 'En cola / procesando…' : 'Aplicar audio y descargar'}
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
