import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { FieldLabel } from '@/components/ui/HelpTip'
import { Button } from '@/components/ui/button'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import {
  readMetadataFromBlob,
  readMetadataForCategory,
  type MetadataReadResult,
} from '@/lib/metadata/readMetadata'
import { extension as fileExtension } from '@/lib/filename/buildDownloadFilename'
import type { StudioTool } from '@/lib/search-params'
import {
  detectCategory,
  type FileCategory,
} from '@/lib/processors/detectCategory'
import { stripImageMetadata } from '@/lib/processors/stripImageMetadata'
import { stripPdfMetadata } from '@/lib/processors/stripPdfMetadata'
import {
  stripVideoMetadata,
  type StripVideoResult,
} from '@/lib/processors/stripVideoMetadata'

const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: 'Imagen',
  pdf: 'PDF',
  video: 'Vídeo',
  audio: 'Audio',
  unknown: 'Desconocido',
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

function sortedEntries(flat: Record<string, string>): [string, string][] {
  return Object.entries(flat).sort(([a], [b]) => a.localeCompare(b))
}

function formatError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

type PreviewProps = {
  url: string | null
  category: FileCategory
  label: string
}

function FilePreview({ url, category, label }: PreviewProps) {
  if (!url) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
        Sin vista previa
      </div>
    )
  }

  if (category === 'image') {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950">
        <p className="border-b border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700">
          {label}
        </p>
        <img
          src={url}
          alt=""
          className="max-h-[min(78vh,920px)] w-full object-contain"
        />
      </div>
    )
  }

  if (category === 'video') {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black dark:border-zinc-700">
        <p className="border-b border-zinc-800 px-2 py-1 text-xs text-zinc-400">
          {label}
        </p>
        <video
          src={url}
          controls
          className="max-h-[min(78vh,920px)] w-full object-contain"
        />
      </div>
    )
  }

  if (category === 'audio') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="mb-2 text-xs text-zinc-500">{label}</p>
        <audio src={url} controls className="w-full" />
      </div>
    )
  }

  if (category === 'pdf') {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        <p className="border-b border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700">
          {label}
        </p>
        <iframe
          title={label}
          src={url}
          className="h-[min(360px,50vh)] w-full bg-white"
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
      <p className="mb-1 font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </p>
      Vista previa no disponible para este tipo. Puedes descargar el archivo
      procesado para comprobarlo.
    </div>
  )
}

function MetadataTable({
  title,
  data,
  loading,
  error,
}: {
  title: string
  data: Record<string, string> | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
        <p className="text-sm text-zinc-500">Leyendo metadatos…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
          {title}
        </h3>
        <p className="text-sm text-amber-900 dark:text-amber-100">{error}</p>
      </div>
    )
  }
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
        <p className="text-sm text-zinc-500">No se detectaron metadatos.</p>
      </div>
    )
  }
  const rows = sortedEntries(data)
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/40">
      <h3 className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700">
        {title}
      </h3>
      <div className="max-h-[min(280px,40vh)] overflow-auto text-xs">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map(([k, v]) => (
              <tr
                key={k}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="max-w-[40%] align-top break-all px-2 py-1.5 font-mono text-zinc-600 dark:text-zinc-400">
                  {k}
                </td>
                <td className="align-top break-all px-2 py-1.5 text-zinc-900 dark:text-zinc-100">
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type MetadataToolProps = { tool: StudioTool }

export function MetadataTool({ tool }: MetadataToolProps) {
  const inputId = useId()
  const {
    file,
    activeId,
    getFileById,
    addFiles,
    clearAll: clearStudioFiles,
    previewUrl: filePreviewUrl,
    nameMode,
    setNameMode,
    nameSuffix32,
    setNameSuffix32,
  } = useStudioMedia()
  const { enqueue } = useStudioProcessQueue()
  const downloadWithPrefs = useStudioDownload()
  const videoNoteRef = useRef<string | null>(null)

  const category = useMemo(
    () => (file ? detectCategory(file) : null),
    [file],
  )

  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [videoNote, setVideoNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addRandomized, setAddRandomized] = useState(false)
  const [previewTab, setPreviewTab] = useState<'original' | 'result'>(
    'original',
  )

  const [beforeMeta, setBeforeMeta] = useState<MetadataReadResult | null>(null)
  const [beforeLoading, setBeforeLoading] = useState(false)
  const [beforeError, setBeforeError] = useState<string | null>(null)

  const [afterMeta, setAfterMeta] = useState<MetadataReadResult | null>(null)
  const [afterLoading, setAfterLoading] = useState(false)
  const [afterError, setAfterError] = useState<string | null>(null)

  const resultPreviewUrl = useMemo(() => {
    if (!resultBlob) return null
    return URL.createObjectURL(resultBlob)
  }, [resultBlob])

  useEffect(() => {
    return () => {
      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl)
    }
  }, [resultPreviewUrl])

  useEffect(() => {
    if (!file || !category) {
      setBeforeMeta(null)
      setBeforeError(null)
      return
    }
    let cancelled = false
    setBeforeLoading(true)
    setBeforeError(null)
    void readMetadataForCategory(file, category)
      .then((res) => {
        if (!cancelled) setBeforeMeta(res)
      })
      .catch((e) => {
        if (!cancelled) setBeforeError(formatError(e))
      })
      .finally(() => {
        if (!cancelled) setBeforeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [file, category])

  useEffect(() => {
    if (!resultBlob || !file || !category) {
      setAfterMeta(null)
      setAfterError(null)
      return
    }
    let cancelled = false
    setAfterLoading(true)
    setAfterError(null)
    const name = `procesado-${file.name}`
    void readMetadataFromBlob(resultBlob, name, category)
      .then((res) => {
        if (!cancelled) setAfterMeta(res)
      })
      .catch((e) => {
        if (!cancelled) setAfterError(formatError(e))
      })
      .finally(() => {
        if (!cancelled) setAfterLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resultBlob, file, category])

  const clearAll = useCallback(() => {
    clearStudioFiles()
    setResultBlob(null)
    setVideoNote(null)
    setError(null)
    setBeforeMeta(null)
    setBeforeError(null)
    setAfterMeta(null)
    setAfterError(null)
    setPreviewTab('original')
  }, [clearStudioFiles])

  const onPickFile = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      addFiles(Array.from(list))
      setResultBlob(null)
      setVideoNote(null)
      setError(null)
      setAfterMeta(null)
      setAfterError(null)
      setPreviewTab('original')
    },
    [addFiles],
  )

  const strip = useCallback(async () => {
    if (!file || !category || !activeId) return
    if (category === 'unknown') {
      setError(
        'Este tipo de archivo no está admitido para limpieza en el cliente.',
      )
      return
    }
    const fileId = activeId
    const randomize = addRandomized
    setError(null)
    setBusy(true)
    setResultBlob(null)
    setVideoNote(null)
    setAfterMeta(null)
    setAfterError(null)
    videoNoteRef.current = null
    try {
      const blob = await enqueue({
        label: `Metadatos — limpieza (${CATEGORY_LABEL[category]})`,
        fileId,
        run: async ({ onProgress }) => {
          const f = getFileById(fileId)
          if (!f) throw new Error('Archivo no encontrado.')
          const cat = detectCategory(f)
          if (cat === 'unknown') {
            throw new Error(
              'Este tipo de archivo no está admitido para limpieza en el cliente.',
            )
          }
          onProgress(10)
          if (cat === 'image') {
            const out = await stripImageMetadata(f, { addRandomized: randomize })
            onProgress(100)
            return out
          }
          if (cat === 'pdf') {
            const out = await stripPdfMetadata(f, { addRandomized: randomize })
            onProgress(100)
            return out
          }
          if (cat === 'video') {
            const out: StripVideoResult = await stripVideoMetadata(f)
            videoNoteRef.current = out.note
            onProgress(100)
            return out.blob
          }
          if (cat === 'audio') {
            const buf = await f.arrayBuffer()
            videoNoteRef.current =
              'Audio: no se re-codifica en el navegador; se descarga una copia. Los metadatos embebidos (ID3, etc.) no se modifican aquí.'
            onProgress(100)
            return new Blob([buf], {
              type: f.type || 'application/octet-stream',
            })
          }
          throw new Error('Tipo no soportado')
        },
      })
      setResultBlob(blob)
      setVideoNote(videoNoteRef.current)
      videoNoteRef.current = null
    } catch (e) {
      setError(`No se pudo procesar el archivo: ${formatError(e)}`)
    } finally {
      setBusy(false)
    }
  }, [file, category, activeId, addRandomized, enqueue, getFileById])

  const retry = useCallback(() => {
    void strip()
  }, [strip])

  const download = useCallback(() => {
    if (!file || !resultBlob) return
    const ext = fileExtension(file.name) || '.bin'
    downloadWithPrefs(resultBlob, '-sin-metadatos', ext)
  }, [file, resultBlob, downloadWithPrefs])

  const activePreviewUrl =
    previewTab === 'result' && resultPreviewUrl
      ? resultPreviewUrl
      : filePreviewUrl

  const showResultTab = Boolean(resultPreviewUrl)

  return (
    <section
      data-studio-tool={tool}
      className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <div>
        <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {TOOL_LABELS[tool] ?? tool}
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Vista previa, lectura de metadatos (EXIF, PDF, contenedor) y archivo
          resultante. La limpieza ocurre en tu navegador.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel
          htmlFor={inputId}
          label="Archivo(s)"
          tip="Puedes elegir varios archivos; se añaden a la sesión. El activo es el que ves en la barra superior del Studio."
        />
        <input
          id={inputId}
          type="file"
          multiple
          className="block w-full cursor-pointer text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-zinc-100 dark:file:border-zinc-600 dark:file:bg-zinc-800"
          onChange={(e) => onPickFile(e.target.files)}
        />
      </div>

      {file && category ? (
        <p className="text-zinc-800 dark:text-zinc-200">
          <span className="text-zinc-500">Categoría:</span>{' '}
          <span className="font-medium">{CATEGORY_LABEL[category]}</span>
          <span className="ml-2 text-zinc-500">({file.name})</span>
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          {showResultTab ? (
            <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
              <button
                type="button"
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewTab === 'original'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
                onClick={() => setPreviewTab('original')}
              >
                Original
              </button>
              <button
                type="button"
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  previewTab === 'result'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
                onClick={() => setPreviewTab('result')}
              >
                Procesado
              </button>
            </div>
          ) : null}
          <FilePreview
            url={activePreviewUrl}
            category={category ?? 'unknown'}
            label={
              previewTab === 'result' && resultPreviewUrl
                ? 'Archivo procesado'
                : 'Archivo original'
            }
          />
        </div>

        <div className="flex flex-col gap-3">
          <MetadataTable
            title="Metadatos (antes)"
            data={beforeMeta?.flat ?? null}
            loading={Boolean(file && category && beforeLoading)}
            error={beforeError}
          />
          <MetadataTable
            title="Metadatos (después)"
            data={afterMeta?.flat ?? null}
            loading={Boolean(resultBlob && afterLoading)}
            error={afterError}
          />
        </div>
      </div>

      <label
        className={`flex items-start gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-600 ${
          category === 'image' || category === 'pdf'
            ? 'cursor-pointer'
            : 'cursor-not-allowed opacity-70'
        }`}
      >
        <input
          type="checkbox"
          className="mt-0.5 cursor-pointer disabled:cursor-not-allowed"
          checked={addRandomized}
          disabled={category !== 'image' && category !== 'pdf'}
          onChange={(e) => setAddRandomized(e.target.checked)}
        />
        <span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Añadir metadatos aleatorios
          </span>
          <span className="block text-zinc-600 dark:text-zinc-400">
            Tras limpiar, inserta EXIF de ejemplo (JPEG) o información de
            documento genérica (PDF). Sin GPS. Solo aplica a imagen y PDF.
          </span>
        </span>
      </label>

      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-600">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Nombre al descargar
        </h3>
        <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
          Se usa en esta pestaña y en las herramientas de vídeo (Visual, Color,
          Estructura, Audio, Capas, Codificar).
        </p>
        <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
          <button
            type="button"
            title="Mantiene el nombre base del archivo al descargar (con tag y extensión según herramienta)."
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              nameMode === 'preserve'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setNameMode('preserve')}
          >
            Conservar nombre
          </button>
          <button
            type="button"
            title="Genera un nombre de archivo nuevo (legible) al descargar, útil para no reutilizar el mismo nombre."
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              nameMode === 'randomize'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setNameMode('randomize')}
          >
            Nombre aleatorio
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 cursor-pointer"
            checked={nameSuffix32}
            onChange={(e) => setNameSuffix32(e.target.checked)}
          />
          <span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Añadir sufijo aleatorio de 32 caracteres
            </span>
            <span className="block text-xs text-zinc-600 dark:text-zinc-400">
              Se inserta antes de la extensión (p. ej.{' '}
              <code className="font-mono text-[11px]">vacación_abc…32.mp4</code>
              ).
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : null}

      {videoNote ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {videoNote}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="cursor-pointer"
          disabled={!file || busy || category === 'unknown'}
          onClick={() => void strip()}
        >
          {busy ? 'Procesando…' : 'Eliminar metadatos'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={!file || busy || !error}
          onClick={retry}
        >
          Reintentar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={busy}
          onClick={clearAll}
        >
          Limpiar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          disabled={!resultBlob}
          onClick={download}
        >
          Descargar resultado
        </Button>
      </div>
    </section>
  )
}

export default MetadataTool
