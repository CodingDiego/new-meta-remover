import { useCallback, useId, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import {
  detectCategory,
  type FileCategory,
} from '@/lib/processors/detectCategory'
import type { StudioTool } from '@/lib/search-params'

const CAT_LABEL: Record<FileCategory, string> = {
  image: 'imagen',
  pdf: 'PDF',
  video: 'vídeo',
  audio: 'audio',
  unknown: 'desconocido',
}

const TOOL_LABELS: Record<string, string> = {
  metadata: 'Metadatos',
  visual: 'Visual',
  color: 'Color',
  structure: 'Estructura',
  audio: 'Audio',
  overlays: 'Capas',
  encode: 'Codificar',
}

export type StudioVideoShellProps = {
  tool: StudioTool
  title?: string
  description: string
  children: ReactNode
}

export function StudioVideoShell({
  tool,
  title,
  description,
  children,
}: StudioVideoShellProps) {
  const inputId = useId()
  const { file, setFile, previewUrl } = useStudioMedia()
  const category = file ? detectCategory(file) : null
  const isVideo = category === 'video'

  const onPick = useCallback(
    (list: FileList | null) => {
      const f = list?.[0] ?? null
      setFile(f)
    },
    [setFile],
  )

  return (
    <section
      data-studio-tool={tool}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <div>
        <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title ?? TOOL_LABELS[tool] ?? tool}
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      {!file ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className="text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Vídeo
          </label>
          <input
            id={inputId}
            type="file"
            accept="video/*"
            className="block w-full cursor-pointer text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-zinc-100 dark:file:border-zinc-600 dark:file:bg-zinc-800"
            onChange={(e) => onPick(e.target.files)}
          />
          <p className="text-xs text-zinc-500">
            También puedes cargar un vídeo desde la pestaña Metadatos; el archivo
            se comparte entre todas las herramientas del estudio.
          </p>
        </div>
      ) : !isVideo ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Se necesita un vídeo</p>
          <p className="mt-1 text-sm">
            El archivo actual es{' '}
            <span className="font-mono">
              {category ? CAT_LABEL[category] : '—'}
            </span>
            . Carga un vídeo (MP4,
            WebM, MOV…) o usa el selector de arriba.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 cursor-pointer"
            onClick={() => setFile(null)}
          >
            Quitar archivo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black dark:border-zinc-700">
            <p className="border-b border-zinc-800 px-2 py-1 text-xs text-zinc-400">
              {file.name}
            </p>
            <video
              src={previewUrl ?? undefined}
              controls
              className="max-h-[min(320px,45vh)] w-full"
            />
          </div>
          {children}
        </div>
      )}
    </section>
  )
}
