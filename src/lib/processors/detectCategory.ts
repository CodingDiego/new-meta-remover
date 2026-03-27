export type FileCategory = 'image' | 'pdf' | 'video' | 'unknown'

const IMAGE_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'tif',
  'tiff',
  'heic',
  'heif',
  'avif',
  'svg',
])

const VIDEO_EXT = new Set([
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'm4v',
  'ogv',
  'mpeg',
  'mpg',
])

function extFromName(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0 || i === name.length - 1) return ''
  return name.slice(i + 1).toLowerCase()
}

/**
 * Classify a file by MIME type when present, otherwise by extension.
 */
export function detectCategory(file: File): FileCategory {
  const mime = file.type.trim().toLowerCase()
  const ext = extFromName(file.name)

  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'

  if (ext === 'pdf') return 'pdf'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'

  return 'unknown'
}
