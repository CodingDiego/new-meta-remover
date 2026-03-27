import { Button } from '@/components/ui/button'
import type { ProcessJobKind } from '@/features/studio/studioProcessQueueContext'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import {
  buildDownloadFilename,
  extension as extFromName,
} from '@/lib/filename/buildDownloadFilename'

function tagForKind(kind: ProcessJobKind): string {
  switch (kind) {
    case 'metadata':
      return '-sin-metadatos'
    case 'visual':
      return '-visual'
    case 'color':
      return '-color'
    case 'structure':
      return '-corte'
    case 'audio':
      return '-audio'
    case 'overlays':
      return '-overlay'
    case 'encode':
      return '-encode'
  }
}

export function ProcessingDock() {
  const {
    queuedJobs,
    runningJob,
    progressPct,
    lastError,
    lastOutput,
    dismissLastOutput,
    reorderQueuedJobs,
  } = useStudioProcessQueue()
  const { getFileById, nameMode, nameCustomStem, nameSuffix32 } =
    useStudioMedia()

  const busy = runningJob != null
  const show =
    busy || queuedJobs.length > 0 || lastError != null || lastOutput != null

  if (!show) return null

  const downloadLastOutput = () => {
    if (!lastOutput) return
    const source = getFileById(lastOutput.fileId)
    const ext =
      lastOutput.mime.includes('mp4')
        ? '.mp4'
        : lastOutput.mime.includes('webm')
          ? '.webm'
          : source
            ? extFromName(source.name) || '.bin'
            : '.bin'
    const filename = source
      ? buildDownloadFilename(source.name, {
          mode: nameMode,
          customStem: nameCustomStem,
          suffix32: nameSuffix32,
          tag: tagForKind(lastOutput.kind),
          ext,
        })
      : `export-${Date.now()}${ext}`
    const url = URL.createObjectURL(lastOutput.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-md flex-col gap-2 p-0 sm:bottom-6 sm:right-6"
      role="region"
      aria-label="Cola de procesamiento"
    >
      <div className="pointer-events-auto rounded-xl border border-zinc-700/90 bg-zinc-950/95 p-4 text-sm text-zinc-100 shadow-2xl backdrop-blur-md">
        <div className="mb-1 flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Cola
          </h2>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            Uno tras otro
          </span>
        </div>

        {busy || queuedJobs.length > 0 ? (
          <div className="mt-3 space-y-3">
            {runningJob ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">
                  En ejecución
                </p>
                <p className="mt-1 truncate text-sm text-zinc-100">
                  {runningJob.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {getFileById(runningJob.fileId)?.name ?? 'Archivo'}
                </p>
                {progressPct != null ? (
                  <div className="mt-2 space-y-1">
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
                ) : (
                  <p className="mt-2 text-[11px] text-zinc-500">Iniciando…</p>
                )}
              </div>
            ) : null}

            {queuedJobs.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-medium text-zinc-500">
                  En espera ({queuedJobs.length}) — arrastra el orden con los
                  botones
                </p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
                  {queuedJobs.map((job, index) => (
                    <li
                      key={job.jobId}
                      className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-2"
                    >
                      <span className="mt-0.5 flex w-5 shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-0.5 text-[10px] leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                          disabled={index === 0}
                          title="Subir en la cola"
                          aria-label={`Subir trabajo ${index + 1}`}
                          onClick={() =>
                            reorderQueuedJobs(index, index - 1)
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-0.5 text-[10px] leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                          disabled={index === queuedJobs.length - 1}
                          title="Bajar en la cola"
                          aria-label={`Bajar trabajo ${index + 1}`}
                          onClick={() =>
                            reorderQueuedJobs(index, index + 1)
                          }
                        >
                          ↓
                        </button>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-zinc-200">
                          {job.label}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {getFileById(job.fileId)?.name ?? 'Archivo'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                        {index + 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {lastError ? (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {lastError}
          </p>
        ) : null}

        {lastOutput ? (
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-300">
              Listo: {lastOutput.label}
            </p>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {getFileById(lastOutput.fileId)?.name ?? 'Archivo'}
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
                onClick={() => downloadLastOutput()}
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

        <p className="mt-3 text-[10px] leading-snug text-zinc-600">
          El avance del archivo activo también aparece en cada herramienta. Solo
          el trabajo en curso se guarda temporalmente en IndexedDB.
        </p>
      </div>
    </div>
  )
}
