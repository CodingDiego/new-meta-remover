/** Plausible random EXIF / PDF fields (no GPS). Ported for client-only strip + optional re-tag. */

const CAMERA_MAKES = [
  'Canon',
  'Nikon',
  'Sony',
  'Apple',
  'Samsung',
  'Google',
] as const

const MODELS: Record<(typeof CAMERA_MAKES)[number], string[]> = {
  Canon: ['Canon EOS R6', 'Canon EOS R5', 'Canon EOS 90D'],
  Nikon: ['NIKON D850', 'NIKON Z6', 'NIKON D7500'],
  Sony: ['ILCE-7M4', 'ILCE-7M3', 'DSC-RX100M7'],
  Apple: ['iPhone 15 Pro', 'iPhone 14', 'iPhone 13 Pro Max'],
  Samsung: ['SM-S918B', 'Galaxy S24 Ultra'],
  Google: ['Pixel 8 Pro', 'Pixel 7'],
}

const SOFTWARE = [
  'Adobe Lightroom',
  'Google Photos',
  'Apple Photos',
  'Snapseed',
] as const

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]!
}

function randomExifDate(): string {
  const y = randomInt(2022, 2025)
  const m = randomInt(1, 12).toString().padStart(2, '0')
  const d = randomInt(1, 28).toString().padStart(2, '0')
  const h = randomInt(0, 23).toString().padStart(2, '0')
  const min = randomInt(0, 59).toString().padStart(2, '0')
  const s = randomInt(0, 59).toString().padStart(2, '0')
  return `${y}:${m}:${d} ${h}:${min}:${s}`
}

export function getRandomImageExif(): {
  make: string
  model: string
  software: string
  dateTimeOriginal: string
  dateTimeDigitized: string
  dpi: number
} {
  const make = pick(CAMERA_MAKES)
  const model = pick(MODELS[make])
  const dpi = pick([72, 96, 150, 200, 300] as const)
  const dt = randomExifDate()
  return {
    make,
    model,
    software: `${pick(SOFTWARE)} ${randomInt(1, 24)}.${randomInt(0, 9)}`,
    dateTimeOriginal: dt,
    dateTimeDigitized: dt,
    dpi,
  }
}

export function getRandomPdfMetadata(): {
  title: string
  author: string
  subject: string
  creator: string
  producer: string
} {
  const titles = ['Document', 'Untitled', 'Export']
  const authors = ['User', 'Author', '']
  return {
    title: pick(titles),
    author: pick(authors),
    subject: pick(['', 'Document', 'Content']),
    creator: pick(['PDF Tool', 'Unknown', '1.0']),
    producer: pick(['PDF Library', 'Processor', 'Unknown']),
  }
}
