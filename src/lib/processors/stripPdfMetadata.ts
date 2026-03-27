import { PDFDocument } from 'pdf-lib'

/**
 * Loads a PDF and clears common document-info / creator fields (pdf-lib).
 */
export async function stripPdfMetadata(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer()
  let doc: PDFDocument
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
  } catch {
    return new Blob([bytes], { type: 'application/pdf' })
  }

  try {
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setCreator('')
    doc.setProducer('')
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
