import { useCallback, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { StudioTool } from '@/lib/search-params'
import { detectCategory, type FileCategory } from '@/lib/processors/detectCategory'
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
  unknown: 'Desconocido',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function baseName(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

export type MetadataToolProps = { tool: StudioTool }

export function MetadataTool({ tool }: MetadataToolProps) {
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<FileCategory | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [videoNote, setVideoNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onPickFile = useCallback((list: FileList | null) => {
    const f = list?.[0] ?? null
    setFile(f)
    setResultBlob(null)
    setVideoNote(null)
    setError(null)
    setCategory(f ? detectCategory(f) : null)
  }, [])

  const strip = useCallback(async () => {
    if (!file || !category) return
    setError(null)
    setBusy(true)
    setResultBlob(null)
    setVideoNote(null)
    try {
      if (category === 'unknown') {
        setError('Este tipo de archivo no está admitido para limpieza en el cliente.')
        return
      }
      if (category === 'image') {
        const out = await stripImageMetadata(file)
        setResultBlob(out)
        return
      }
      if (category === 'pdf') {
        const out = await stripPdfMetadata(file)
        setResultBlob(out)
        return
      }
      if (category === 'video') {
        const out: StripVideoResult = await stripVideoMetadata(file)
        setResultBlob(out.blob)
        setVideoNote(out.note)
        return
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Error al procesar el archivo.'
      setError(`No se pudo eliminar metadatos: ${msg}`)
    } finally {
      setBusy(false)
    }
  }, [file, category])

  const download = useCallback(() => {
    if (!file || !resultBlob) return
    const ext = file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.'))
      : ''
    const name = `${baseName(file.name)}-sin-metadatos${ext}`
    downloadBlob(resultBlob, name)
  }, [file, resultBlob])

  return (
    <section
      data-studio-tool={tool}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <div>
        <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Metadatos
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Sube un archivo pequeño para quitar metadatos en el navegador (imagen / PDF).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Archivo
        </label>
        <input
          id={inputId}
          type="file"
          className="block w-full text-zinc-900 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-zinc-100 dark:file:border-zinc-600 dark:file:bg-zinc-800"
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

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {videoNote ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {videoNote}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!file || busy || category === 'unknown'}
          onClick={() => void strip()}
        >
          {busy ? 'Procesando…' : 'Eliminar metadatos'}
        </Button>
        <Button
          type="button"
          variant="outline"
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
