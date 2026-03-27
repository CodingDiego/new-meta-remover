import exifr from 'exifr'
import { PDFDocument } from 'pdf-lib'
import { flattenMetadata } from '@/lib/metadata/flattenMetadata'
import type { FileCategory } from '@/lib/processors/detectCategory'

export type MetadataReadResult = {
  /** Flattened key → string for tables */
  flat: Record<string, string>
  /** Raw parse when useful (e.g. exifr object) */
  raw?: unknown
}

function fileBase(file: File): Record<string, string> {
  return {
    'file.name': file.name,
    'file.size': `${file.size} bytes`,
    'file.type': file.type || '(empty)',
    'file.lastModified': new Date(file.lastModified).toISOString(),
  }
}

export async function readImageMetadataFull(file: File): Promise<MetadataReadResult> {
  const base = fileBase(file)
  let raw: Record<string, unknown> | undefined
  try {
    raw = (await exifr.parse(file, true)) as Record<string, unknown> | undefined
  } catch {
    raw = undefined
  }
  const merged = { ...base, ...flattenMetadata(raw ?? {}) }
  return { flat: merged, raw }
}

export async function readPdfMetadataFull(file: File): Promise<MetadataReadResult> {
  const base = fileBase(file)
  try {
    const buf = await file.arrayBuffer()
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
    const meta: Record<string, string> = { ...base }
    try {
      const t = doc.getTitle()
      if (t) meta['pdf.title'] = t
    } catch {
      /* ignore */
    }
    try {
      const a = doc.getAuthor()
      if (a) meta['pdf.author'] = a
    } catch {
      /* ignore */
    }
    try {
      const s = doc.getSubject()
      if (s) meta['pdf.subject'] = s
    } catch {
      /* ignore */
    }
    try {
      const k = doc.getKeywords()
      if (k) meta['pdf.keywords'] = k
    } catch {
      /* ignore */
    }
    try {
      const c = doc.getCreator()
      if (c) meta['pdf.creator'] = c
    } catch {
      /* ignore */
    }
    try {
      const p = doc.getProducer()
      if (p) meta['pdf.producer'] = p
    } catch {
      /* ignore */
    }
    try {
      const cr = doc.getCreationDate()
      if (cr) meta['pdf.creationDate'] = cr.toISOString()
    } catch {
      /* ignore */
    }
    try {
      const mod = doc.getModificationDate()
      if (mod) meta['pdf.modificationDate'] = mod.toISOString()
    } catch {
      /* ignore */
    }
    return { flat: meta }
  } catch {
    return { flat: base }
  }
}

export async function readVideoMetadataFull(file: File): Promise<MetadataReadResult> {
  const base = fileBase(file)
  let extra: Record<string, string> = {}
  if (file.size < 80 * 1024 * 1024) {
    try {
      const parsed = await exifr.parse(file, { mergeOutput: true })
      extra = flattenMetadata(parsed ?? {})
    } catch {
      /* container may not expose EXIF in-browser */
    }
  }
  return {
    flat: { ...base, ...extra },
    raw: undefined,
  }
}

export async function readAudioMetadataFull(file: File): Promise<MetadataReadResult> {
  return { flat: fileBase(file) }
}

export async function readUnknownMetadataFull(file: File): Promise<MetadataReadResult> {
  return { flat: fileBase(file) }
}

export async function readMetadataForCategory(
  file: File,
  category: FileCategory,
): Promise<MetadataReadResult> {
  switch (category) {
    case 'image':
      return readImageMetadataFull(file)
    case 'pdf':
      return readPdfMetadataFull(file)
    case 'video':
      return readVideoMetadataFull(file)
    case 'audio':
      return readAudioMetadataFull(file)
    default:
      return readUnknownMetadataFull(file)
  }
}

/** Read metadata from a processed blob (e.g. after strip). */
export async function readMetadataFromBlob(
  blob: Blob,
  fileName: string,
  category: FileCategory,
): Promise<MetadataReadResult> {
  const file = new File([blob], fileName, {
    type: blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  })
  return readMetadataForCategory(file, category)
}
