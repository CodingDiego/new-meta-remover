import { useCallback, useId, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { formatBytes, formatDurationSeconds } from '@/lib/formatBytes'
import { getMaxVideoBytes } from '@/lib/video/ffmpegRun'
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

const PREVIEW_MAX_H = 'min(78vh, 920px)'

function VideoPlayerBlock({
  src,
  onDuration,
}: {
  src: string
  onDuration: (sec: number | null) => void
}) {
  return (
    <video
      key={src}
      className="mx-auto block w-full object-contain"
      style={{ maxHeight: PREVIEW_MAX_H }}
      src={src}
      controls
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration
        onDuration(Number.isFinite(d) ? d : null)
      }}
    />
  )
}

/** key={resultUrl} resets tab so a new export defaults to «Después de procesar». */
function OriginalVersusResultPreview({
  originalUrl,
  resultUrl,
  onClearCompare,
  shellRef,
  onToggleFullscreen,
}: {
  originalUrl: string
  resultUrl: string
  onClearCompare?: () => void
  shellRef: React.RefObject<HTMLDivElement | null>
  onToggleFullscreen: () => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const activeSrc = showOriginal ? originalUrl : resultUrl

  return (
    <>
      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
        <button
          type="button"
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            showOriginal
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          onClick={() => setShowOriginal(true)}
        >
          Original
        </button>
        <button
          type="button"
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            !showOriginal
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          onClick={() => setShowOriginal(false)}
        >
          Después de procesar
        </button>
        {onClearCompare ? (
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-md px-2 py-1.5 text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
            onClick={() => {
              onClearCompare()
            }}
          >
            Quitar resultado
          </button>
        ) : null}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Vista previa
      </p>
      <div
        ref={shellRef}
        className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-inner"
      >
        <VideoPlayerBlock
          src={activeSrc}
          onDuration={() => {}}
        />
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            onClick={() => onToggleFullscreen()}
            className="cursor-pointer rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
          >
            Pantalla completa
          </button>
        </div>
      </div>
    </>
  )
}

export type StudioVideoShellProps = {
  tool: StudioTool
  title?: string
  description: string
  children: ReactNode
  /** Object URL of last FFmpeg output — enables Original / Resultado tabs */
  compareResultUrl?: string | null
  onClearCompare?: () => void
}

export function StudioVideoShell({
  tool,
  title,
  description,
  children,
  compareResultUrl = null,
  onClearCompare,
}: StudioVideoShellProps) {
  const inputId = useId()
  const shellRef = useRef<HTMLDivElement>(null)
  const { file, setFile, previewUrl } = useStudioMedia()
  const category = file ? detectCategory(file) : null
  const isVideo = category === 'video'

  const [durationSec, setDurationSec] = useState<number | null>(null)

  const onPick = useCallback(
    (list: FileList | null) => {
      const f = list?.[0] ?? null
      setFile(f)
      onClearCompare?.()
    },
    [setFile, onClearCompare],
  )

  const maxBytes = getMaxVideoBytes()
  const largeWarning =
    file && isVideo && file.size > maxBytes * 0.55

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen().catch(() => {})
    }
  }, [])

  return (
    <section
      data-studio-tool={tool}
      className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <div>
        <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title ?? TOOL_LABELS[tool] ?? tool}
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      <ol className="list-inside list-decimal space-y-1 rounded-lg border border-zinc-100 bg-zinc-50/90 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        <li>Sube o reutiliza un vídeo (compartido con Metadatos).</li>
        <li>Reprodúcelo a pantalla completa si quieres revisar el detalle.</li>
        <li>Ajusta los controles de abajo y procesa; compara en pestañas.</li>
      </ol>

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
            Un solo archivo por sesión de estudio; cambia de pestaña sin volver
            a subirlo.
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
            . Carga un vídeo (MP4, WebM, MOV…) o usa el selector de arriba.
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
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {file.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatBytes(file.size)}
                {durationSec != null && (
                  <>
                    {' · '}
                    <span className="tabular-nums">
                      {formatDurationSeconds(durationSec)}
                    </span>
                  </>
                )}
                {' · '}
                hasta ~{formatBytes(maxBytes)} procesables en el navegador
              </p>
            </div>
          </div>

          {largeWarning ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Archivo grande: el proceso puede tardar y usar mucha RAM. Cierra
              otras pestañas si ves lentitud o cierres inesperados.
            </p>
          ) : null}

          {compareResultUrl && previewUrl ? (
            <OriginalVersusResultPreview
              key={compareResultUrl}
              originalUrl={previewUrl}
              resultUrl={compareResultUrl}
              onClearCompare={onClearCompare}
              shellRef={shellRef}
              onToggleFullscreen={toggleFullscreen}
            />
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Vista previa (completa)
              </p>
              <div
                ref={shellRef}
                className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black shadow-inner"
              >
                {previewUrl ? (
                  <VideoPlayerBlock
                    src={previewUrl}
                    onDuration={(d) => setDurationSec(d)}
                  />
                ) : null}
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => toggleFullscreen()}
                    className="cursor-pointer rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
                  >
                    Pantalla completa
                  </button>
                </div>
              </div>
            </>
          )}

          <details className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
              Sobre re-codificación y plataformas
            </summary>
            <p className="mt-2 leading-relaxed">
              Exportar de nuevo con FFmpeg cambia códec, contenedor y huella
              del archivo respecto al original; eso puede alterar comprobaciones
              por hash o metadatos. Las redes usan señales propias (perceptual
              hashing, audio, etc.); no garantizamos eludir ningún sistema de
              detección de duplicados.
            </p>
          </details>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Controles
            </h3>
            {children}
          </div>
        </>
      )}
    </section>
  )
}
