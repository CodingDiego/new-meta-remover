import exifr from 'exifr'
import piexif from 'piexifjs'

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...sub)
  }
  return binary
}

function binaryStringToUint8Array(binary: string): Uint8Array {
  const len = binary.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i) & 0xff
  }
  return out
}

function isJpeg(buffer: ArrayBuffer): boolean {
  const b = new Uint8Array(buffer)
  return b.length >= 2 && b[0] === 0xff && b[1] === 0xd8
}

function isPng(buffer: ArrayBuffer): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const b = new Uint8Array(buffer)
  if (b.length < sig.length) return false
  return sig.every((v, i) => b[i] === v)
}

function isWebp(buffer: ArrayBuffer): boolean {
  const b = new Uint8Array(buffer)
  if (b.length < 12) return false
  return (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
}

async function stripViaCanvas(
  file: File,
  mime: string
): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d')
    ctx.drawImage(bmp, 0, 0)
    const quality =
      mime === 'image/jpeg' || mime === 'image/webp' ? 0.92 : undefined
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, quality)
    })
    if (!blob) throw new Error('toBlob')
    return blob
  } finally {
    bmp.close()
  }
}

async function jpegStillHasExif(blob: Blob): Promise<boolean> {
  try {
    const tags = await exifr.parse(blob, { icc: false })
    if (!tags || typeof tags !== 'object') return false
    return Object.keys(tags as object).length > 0
  } catch {
    return true
  }
}

/**
 * Strips embedded metadata from common raster images.
 * JPEG: removes EXIF via piexifjs; uses exifr to verify / canvas fallback if needed.
 * PNG / WebP: re-encodes via canvas (strips chunks / EXIF / XMP in practice).
 */
export async function stripImageMetadata(file: File): Promise<Blob> {
  const mime = file.type || 'application/octet-stream'
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    return new Blob([file], { type: mime })
  }

  try {
    await exifr.parse(file, { icc: false })
  } catch {
    /* unreadable exifr payload — still attempt byte-level strip */
  }

  if (isJpeg(buffer)) {
    try {
      const binary = arrayBufferToBinaryString(buffer)
      const stripped = piexif.remove(binary)
      const out = binaryStringToUint8Array(stripped)
      const ab = out.buffer.slice(
        out.byteOffset,
        out.byteOffset + out.byteLength,
      ) as ArrayBuffer
      const blob = new Blob([ab], {
        type: 'image/jpeg',
      })
      if (await jpegStillHasExif(blob)) {
        return await stripViaCanvas(file, 'image/jpeg')
      }
      return blob
    } catch {
      try {
        return await stripViaCanvas(file, 'image/jpeg')
      } catch {
        return new Blob([buffer], { type: 'image/jpeg' })
      }
    }
  }

  if (isPng(buffer)) {
    try {
      return await stripViaCanvas(file, 'image/png')
    } catch {
      return new Blob([buffer], { type: 'image/png' })
    }
  }

  if (isWebp(buffer)) {
    try {
      return await stripViaCanvas(file, 'image/webp')
    } catch {
      return new Blob([buffer], { type: 'image/webp' })
    }
  }

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    try {
      return await stripViaCanvas(file, 'image/jpeg')
    } catch {
      return new Blob([buffer], { type: mime })
    }
  }
  if (mime === 'image/png') {
    try {
      return await stripViaCanvas(file, 'image/png')
    } catch {
      return new Blob([buffer], { type: mime })
    }
  }
  if (mime === 'image/webp') {
    try {
      return await stripViaCanvas(file, 'image/webp')
    } catch {
      return new Blob([buffer], { type: mime })
    }
  }

  return new Blob([buffer], { type: mime })
}
