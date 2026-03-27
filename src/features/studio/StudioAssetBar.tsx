import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/formatBytes'

import { useStudioMedia } from '@/features/studio/useStudioMedia'

export function StudioAssetBar() {
  const { file, mediaHydrated, setFile } = useStudioMedia()

  if (!mediaHydrated) {
    return (
      <div
        className="h-16 animate-pulse rounded-xl border border-zinc-700/40 bg-zinc-800/30"
        aria-hidden
      />
    )
  }

  if (!file) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-600/80 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
        <span className="text-zinc-500">Activo:</span> ningún archivo. Sube un
        vídeo desde una herramienta (p. ej. Metadatos o Visual) o{' '}
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 to-zinc-900/60 px-4 py-3 shadow-inner">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-medium text-emerald-50">
          {file.name}
        </p>
        <p className="mt-0.5 text-xs text-emerald-200/70">
          {formatBytes(file.size)} · persistido en este navegador (IndexedDB)
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 cursor-pointer border-zinc-600 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800"
        onClick={() => setFile(null)}
      >
        Quitar archivo
      </Button>
    </div>
  )
}
