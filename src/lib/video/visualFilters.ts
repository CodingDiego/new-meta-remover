/**
 * Cadena de video para la herramienta Visual: espejo horizontal opcional y
 * rotación en grados (expresión FFmpeg en radianes).
 *
 * Orden: primero `hflip` (si aplica), luego `rotate`.
 */
export function buildVisualTransformFilter(
  rotationDeg: number,
  flipHorizontal: boolean,
): string {
  const parts: string[] = []
  if (flipHorizontal) {
    parts.push('hflip')
  }
  if (rotationDeg !== 0) {
    const clamped = Math.max(-180, Math.min(180, rotationDeg))
    parts.push(
      `rotate=2*PI/360*(${clamped}):fillcolor=black`,
    )
  }
  if (parts.length === 0) {
    throw new Error(
      'Elige un ángulo distinto de 0° o activa el espejo horizontal.',
    )
  }
  return parts.join(',')
}
