import { Button } from '@/components/ui/button'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'

export function ProcessingDock() {
  const {
    queuedCount,
    runningLabel,
    progressPct,
    lastError,
    lastOutput,
    dismissLastOutput,
  } = useStudioProcessQueue()

  const busy = runningLabel != null
  const show =
    busy || queuedCount > 0 || lastError != null || lastOutput != null

  if (!show) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 p-0 sm:bottom-6 sm:right-6"
      role="region"
      aria-label="Cola de procesamiento"
    >
      <div className="pointer-events-auto rounded-xl border border-zinc-700/90 bg-zinc-950/95 p-4 text-sm text-zinc-100 shadow-2xl backdrop-blur-md">
        {busy || queuedCount > 0 ? (
          <div className="space-y-2">
            <p className="font-medium text-emerald-300">
              {busy ? 'Procesando…' : 'En cola'}
            </p>
            {runningLabel ? (
              <p className="text-xs text-zinc-400">{runningLabel}</p>
            ) : null}
            {queuedCount > 0 ? (
              <p className="text-xs text-zinc-500">
                {queuedCount} trabajo{queuedCount !== 1 ? 's' : ''} en espera
              </p>
            ) : null}
            {progressPct != null ? (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-right text-[10px] text-zinc-500">
                  {progressPct}%
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {lastError ? (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {lastError}
          </p>
        ) : null}

        {lastOutput ? (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-300">
              Listo: {lastOutput.label}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Puedes descargar el resultado si cambiaste de pantalla durante el
              proceso.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => {
                  const a = document.createElement('a')
                  const url = URL.createObjectURL(lastOutput.blob)
                  a.href = url
                  const ext = lastOutput.mime.includes('mp4')
                    ? 'mp4'
                    : lastOutput.mime.includes('webm')
                      ? 'webm'
                      : 'bin'
                  a.download = `resultado-${Date.now()}.${ext}`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                Descargar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer border-zinc-600"
                onClick={() => dismissLastOutput()}
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}

        <p className="mt-2 text-[10px] leading-snug text-zinc-600">
          Solo el archivo en proceso se guarda temporalmente en IndexedDB; al
          terminar se libera.
        </p>
      </div>
    </div>
  )
}
