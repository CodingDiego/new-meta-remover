const FIFTY_MB = 50 * 1024 * 1024

export type StripVideoResult = {
  blob: Blob
  /** Client-side full metadata removal is not available; server processing required */
  note: string
}

/**
 * Videos: no full client-side strip in this phase. Files ≥ 50MB are not fully read here.
 */
export async function stripVideoMetadata(file: File): Promise<StripVideoResult> {
  const note =
    'La eliminación completa de metadatos de vídeo requiere el servidor.'

  if (file.size >= FIFTY_MB) {
    return {
      blob: file,
      note:
        'Archivo grande (≥ 50 MB): no se carga en el navegador. ' + note,
    }
  }

  return {
    blob: new Blob([await file.arrayBuffer()], {
      type: file.type || 'application/octet-stream',
    }),
    note,
  }
}
