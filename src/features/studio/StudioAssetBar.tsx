import { useId, useRef } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/formatBytes'

import { useStudioMedia } from '@/features/studio/useStudioMedia'

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-emerald-200/80">
          Archivos en esta sesión ({items.length}) — solo el trabajo en curso se
          guarda en IndexedDB; al terminar se borra.
        </p>
        <div className="flex flex-wrap gap-2">
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
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Seleccionar archivo activo"
      >
        {items.map((it) => {
          const active = it.id === activeId
          return (
            <div
              key={it.id}
              className={`flex max-w-[min(100%,240px)] min-w-0 items-center gap-1 rounded-lg border text-xs transition-colors ${
                active
                  ? 'border-emerald-500 bg-emerald-900/50 text-emerald-50'
                  : 'border-zinc-600 bg-zinc-900/50 text-zinc-300'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                title={it.file.name}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left hover:bg-white/5"
                onClick={() => setActiveId(it.id)}
              >
                <span className="truncate font-mono">{it.file.name}</span>
                <span className="shrink-0 text-[10px] text-zinc-500">
                  {formatBytes(it.file.size)}
                </span>
              </button>
              <button
                type="button"
                className="shrink-0 px-2 py-1.5 text-zinc-500 hover:text-red-300"
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
