import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let instance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

const MAX_VIDEO_BYTES = 180 * 1024 * 1024

export function getMaxVideoBytes(): number {
  return MAX_VIDEO_BYTES
}

export async function getFfmpeg(): Promise<FFmpeg> {
  if (instance?.loaded) return instance
  if (!loadPromise) {
    loadPromise = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')
      const ff = new FFmpeg()
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      instance = ff
      return ff
    })()
  }
  return loadPromise
}

function extFromName(name: string): string {
  const m = name.match(/(\.[^./\\]+)$/)
  return m ? m[1]!.toLowerCase() : '.mp4'
}

export async function ffmpegWriteInput(ff: FFmpeg, input: File): Promise<string> {
  const ext = extFromName(input.name)
  const inName = `in${ext}`
  await ff.writeFile(inName, await fetchFile(input))
  return inName
}

export async function ffmpegReadOut(
  ff: FFmpeg,
  outName: string,
  mime: string,
): Promise<Blob> {
  const data = await ff.readFile(outName)
  await ff.deleteFile(outName).catch(() => {})
  if (typeof data === 'string') {
    throw new Error('Salida binaria esperada')
  }
  const copy = new Uint8Array(data as Uint8Array)
  return new Blob([copy], { type: mime })
}

export async function ffmpegCleanupInput(
  ff: FFmpeg,
  inName: string,
): Promise<void> {
  await ff.deleteFile(inName).catch(() => {})
}

/** H.264 + AAC, faststart — typical web export */
export const FFMPEG_MP4_TAIL = [
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '23',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-movflags',
  '+faststart',
] as const

export const OUT_MP4 = 'out.mp4'

export function assertVideoSize(file: File): void {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `El vídeo supera ${Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))} MB. Usa un archivo más pequeño para procesarlo en el navegador.`,
    )
  }
}
