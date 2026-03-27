import { PDFDocument } from 'pdf-lib'
import { getRandomPdfMetadata } from '@/lib/metadata/randomMetadata'

export type StripPdfOptions = {
  /** After clearing, set plausible random document info. */
  addRandomized?: boolean
}

/**
 * Loads a PDF and clears common document-info / creator fields (pdf-lib).
 */
export async function stripPdfMetadata(
  file: File,
  options?: StripPdfOptions,
): Promise<Blob> {
  const addRandomized = options?.addRandomized ?? false
  const bytes = await file.arrayBuffer()
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
  } catch {
    return new Blob([bytes], { type: 'application/pdf' })
  }

  try {
    if (addRandomized) {
      const r = getRandomPdfMetadata()
      const now = new Date()
      doc.setTitle(r.title)
      doc.setAuthor(r.author)
      doc.setSubject(r.subject)
      doc.setKeywords([])
      doc.setCreator(r.creator)
      doc.setProducer(r.producer)
      doc.setCreationDate(now)
      doc.setModificationDate(now)
    } else {
      doc.setTitle('')
      doc.setAuthor('')
      doc.setSubject('')
      doc.setKeywords([])
      doc.setCreator('')
      doc.setProducer('')
    }
  } catch {
    return new Blob([bytes], { type: 'application/pdf' })
  }

  try {
    const out = await doc.save()
    const ab = out.buffer.slice(
      out.byteOffset,
      out.byteOffset + out.byteLength,
    ) as ArrayBuffer
    return new Blob([ab], { type: 'application/pdf' })
  } catch {
    return new Blob([bytes], { type: 'application/pdf' })
  }
}
