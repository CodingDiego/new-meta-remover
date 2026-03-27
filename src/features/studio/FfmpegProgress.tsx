/**
 * Progress UI for ffmpeg.wasm jobs. When `progressPct` is null while busy,
 * shows an indeterminate bar (browser support varies).
 */
export function FfmpegProgress({
  busy,
  progressPct,
}: {
  busy: boolean
  /** 0–100, or null while running but before first progress tick */
  progressPct: number | null
}) {
  if (!busy) return null

  const determinate = progressPct !== null

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Procesando vídeo con FFmpeg
        </span>
        <span className="tabular-nums">
          {determinate ? `${progressPct}%` : 'Iniciando…'}
        </span>
      </div>
      <progress
        className="h-2.5 w-full rounded-md accent-zinc-900 dark:accent-zinc-100 [&::-webkit-progress-bar]:rounded-md [&::-webkit-progress-bar]:bg-zinc-200 dark:[&::-webkit-progress-bar]:bg-zinc-700 [&::-webkit-progress-value]:rounded-md [&::-webkit-progress-value]:bg-zinc-900 dark:[&::-webkit-progress-value]:bg-zinc-100"
        max={100}
        value={determinate ? progressPct : undefined}
      />
      <p className="mt-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        El porcentaje es orientativo (depende del códec y la duración). Puede
        quedarse en 0% unos segundos al cargar el archivo en memoria.
      </p>
    </div>
  )
}
