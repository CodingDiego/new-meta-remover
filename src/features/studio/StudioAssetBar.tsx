import { useId, useRef } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/formatBytes'

import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import type { StudioMediaItem } from '@/features/studio/studioMediaContext'

function assetButtonTitle(it: StudioMediaItem): string {
  const lines = [it.file.name]
  if (it.nameMode === 'randomize') {
    lines.push('Descarga: nombre aleatorio')
  } else if (it.nameMode === 'custom') {
    lines.push(
      it.nameCustomStem.trim()
        ? `Descarga: base personalizada «${it.nameCustomStem.trim()}»`
        : 'Descarga: base personalizada (vacía → nombre del archivo)',
    )
  }
  if (it.nameSuffix32) lines.push('Descarga: sufijo aleatorio de 32 caracteres')
  return lines.join('\n')
}

export function StudioAssetBar() {
  const addId = useId()
  const addInputRef = useRef<HTMLInputElement>(null)
  const {
    items,
    activeId,
    mediaHydrated,
    addFiles,
    removeItem,
    setActiveId,
  } = useStudioMedia()
  const { runningJob, queuedJobs } = useStudioProcessQueue()

  if (!mediaHydrated) {
    return (
      <div
        className="h-16 animate-pulse rounded-xl border border-zinc-700/40 bg-zinc-800/30"
        aria-hidden
      />
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-600/80 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
        <span className="text-zinc-500">Activo:</span> ningún archivo. Sube
        vídeos desde una herramienta o{' '}
        <Link
          to="/"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          vuelve al inicio
        </Link>
        .
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 to-zinc-900/60 px-4 py-3 shadow-inner">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className="min-w-0 max-w-full text-xs font-medium leading-snug text-emerald-200/80 sm:min-w-[12rem] sm:flex-1">
          Archivos en esta sesión ({items.length}) — solo el trabajo en curso se
          guarda en IndexedDB; al terminar se borra. El nombre al descargar es
          distinto por cada archivo (Metadatos).
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            ref={addInputRef}
            id={addId}
            type="file"
            accept="video/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const list = e.target.files
              if (list?.length) addFiles(Array.from(list))
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer border-emerald-700/50 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/40"
            title="Añade más vídeos a la cola de la sesión (en memoria). No se guardan todos en disco."
            onClick={() => addInputRef.current?.click()}
          >
            + Añadir vídeos
          </Button>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="tablist"
        aria-label="Seleccionar archivo activo"
      >
        {items.map((it) => {
          const active = it.id === activeId
          const runningHere = runningJob?.fileId === it.id
          const queuedHere = queuedJobs.filter((j) => j.fileId === it.id).length
          const downloadHint =
            it.nameMode === 'randomize'
              ? 'Desc. aleatoria'
              : it.nameMode === 'custom'
                ? it.nameCustomStem.trim()
                  ? 'Desc. personalizada'
                  : 'Desc. (vacía→archivo)'
                : it.nameSuffix32
                  ? 'Sufijo 32'
                  : null
          return (
            <div
              key={it.id}
              className={`flex min-w-0 max-w-full items-stretch overflow-hidden rounded-lg border text-xs transition-colors ${
                active
                  ? 'border-emerald-500 bg-emerald-900/50 text-emerald-50'
                  : 'border-zinc-600 bg-zinc-900/50 text-zinc-300'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                title={assetButtonTitle(it)}
                className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2 py-1.5 text-left hover:bg-white/5 dark:hover:bg-white/5"
                onClick={() => setActiveId(it.id)}
              >
                <span className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5 overflow-hidden text-left">
                  <span className="block min-w-0 truncate font-mono text-[11px] leading-tight sm:text-xs">
                    {it.file.name}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-500">
                    <span className="shrink-0 tabular-nums">
                      {formatBytes(it.file.size)}
                    </span>
                    {downloadHint ? (
                      <span
                        className={`max-w-full truncate rounded px-1 py-px ${
                          active
                            ? 'bg-emerald-800/80 text-emerald-100'
                            : 'bg-zinc-800/90 text-zinc-300'
                        }`}
                        title={assetButtonTitle(it)}
                      >
                        {downloadHint}
                      </span>
                    ) : null}
                    {runningHere ? (
                      <span className="shrink-0 rounded bg-amber-500/90 px-1 py-px font-medium text-zinc-950">
                        En curso
                      </span>
                    ) : null}
                    {queuedHere > 0 ? (
                      <span
                        className="shrink-0 rounded bg-zinc-700 px-1 py-px text-zinc-200"
                        title={`${queuedHere} trabajo${queuedHere !== 1 ? 's' : ''} en cola`}
                      >
                        +{queuedHere} cola
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="shrink-0 border-l border-zinc-600/80 px-2 py-1.5 text-zinc-500 hover:bg-white/5 hover:text-red-300 dark:border-zinc-600/80 dark:hover:bg-white/5 dark:hover:text-red-300"
                title="Quitar de la lista"
                aria-label={`Quitar ${it.file.name}`}
                onClick={() => removeItem(it.id)}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
