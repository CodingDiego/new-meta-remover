const ALPHANUM =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomChars(len: number): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHANUM[b % ALPHANUM.length]).join('')
}

export function randomId32(): string {
  return randomChars(32)
}

export function randomStem(length = 24): string {
  return randomChars(length)
}

export function baseName(filename: string): string {
  const i = filename.lastIndexOf('.')
  if (i <= 0) return filename
  return filename.slice(0, i)
}

export function extension(filename: string): string {
  const i = filename.lastIndexOf('.')
  if (i < 0 || i === filename.length - 1) return ''
  return filename.slice(i)
}

/** Safe ASCII-ish stem for downloads */
export function sanitizeStem(name: string): string {
  const s = name.replace(/[^\w\- ().[\]]+/g, '_').trim()
  return s.slice(0, 120) || 'export'
}

export type DownloadNameMode = 'preserve' | 'randomize' | 'custom'

export type BuildDownloadFilenameOptions = {
  mode: DownloadNameMode
  /**
   * When `mode === 'custom'`, used as the file stem (sanitized). If empty or
   * only whitespace, falls back to the original file base name.
   */
  customStem?: string
  /** When true, append `_` + 32 random chars before the tag and extension */
  suffix32: boolean
  /** e.g. "-sin-metadatos", "-visual" */
  tag: string
  /** Output extension including dot; defaults from original filename */
  ext?: string
}

export function buildDownloadFilename(
  originalName: string,
  opts: BuildDownloadFilenameOptions,
): string {
  const ext = opts.ext ?? (extension(originalName) || '.bin')
  const preserved = sanitizeStem(baseName(originalName))
  const stem =
    opts.mode === 'preserve'
      ? preserved
      : opts.mode === 'randomize'
        ? randomStem(24)
        : sanitizeStem((opts.customStem ?? '').trim()) || preserved
  const mid = opts.suffix32 ? `_${randomId32()}` : ''
  return `${stem}${mid}${opts.tag}${ext}`
}
