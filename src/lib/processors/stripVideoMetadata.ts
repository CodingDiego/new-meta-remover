export type StripVideoResult = {
  blob: Blob
  note: string
}

/**
 * Vídeo: no hay strip de metadatos embebidos en el cliente sin re-codificar.
 * Devolvemos el mismo archivo (sin copiar a memoria) para descarga / metadatos de archivo.
 */
export async function stripVideoMetadata(file: File): Promise<StripVideoResult> {
  return {
    blob: file,
    note:
      'Los metadatos de contenedor (y pistas) no se eliminan sin re-codificar. Usa Visual, Color, Codificar u otras herramientas para exportar un MP4 nuevo; eso cambia códec y huella respecto al original.',
  }
}
