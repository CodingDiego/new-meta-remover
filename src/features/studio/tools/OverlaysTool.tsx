import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { StudioVideoShell } from '@/features/studio/StudioVideoShell'
import { useStudioDownload } from '@/features/studio/useStudioDownload'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useVideoCompareResult } from '@/features/studio/useVideoCompareResult'
import { fetchFile } from '@ffmpeg/util'
import {
  assertVideoSize,
  ffmpegCleanupInput,
  ffmpegReadOut,
  ffmpegWriteInput,
  FFMPEG_MP4_TAIL,
  getFfmpeg,
  OUT_MP4,
} from '@/lib/video/ffmpegRun'
import type { StudioTool } from '@/lib/search-params'

function formatErr(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Error desconocido.'
}

async function watermarkPng(text: string): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = Math.min(520, 24 + text.length * 12)
  c.height = 52
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas no disponible')
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = '#ffffff'
  ctx.font = '20px system-ui, Segoe UI, sans-serif'
  const line = text.slice(0, 56)
  ctx.fillText(line, 10, 32)
  return await new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG'))), 'image/png')
  })
}

export type OverlaysToolProps = { tool: StudioTool }

function OverlayControls({
  onProcessed,
}: {
  onProcessed: (blob: Blob) => void
}) {
  const { file } = useStudioMedia()
  const [text, setText] = useState('Marca de agua')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (!file) return
    const t = text.trim()
    if (!t) {
      setError('Escribe un texto para la marca.')
      return
    }
    setBusy(true)
    setError(null)
    setHint(null)
    try {
      assertVideoSize(file)
      const png = await watermarkPng(t)
      const ff = await getFfmpeg()
      const inName = await ffmpegWriteInput(ff, file)
      await ff.writeFile('wm.png', await fetchFile(png))
      const filter =
        '[1:v]scale=iw*0.35:-1[wm];[0:v][wm]overlay=W-w-12:H-h-12'
      const code = await ff.exec([
        '-i',
        inName,
        '-i',
        'wm.png',
        '-filter_complex',
        filter,
        ...FFMPEG_MP4_TAIL,
        OUT_MP4,
      ])
      await ffmpegCleanupInput(ff, inName)
      await ff.deleteFile('wm.png').catch(() => {})
      if (code !== 0) throw new Error('ffmpeg no pudo superponer la imagen.')
      const blob = await ffmpegReadOut(ff, OUT_MP4, 'video/mp4')
      onProcessed(blob)
      setHint('Marca aplicada. Revisa la pestaña «Después de procesar».')
    } catch (e) {
      setError(formatErr(e))
    } finally {
      setBusy(false)
    }
  }, [file, text, onProcessed])

  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        El texto se dibuja en una banda y se superpone al vídeo; compara el
        resultado en la pestaña.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Texto
        </span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{hint}</p>
      ) : null}
      <Button
        type="button"
        className="w-fit cursor-pointer"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Procesando…' : 'Aplicar marca y descargar'}
      </Button>
    </div>
  )
}

export function OverlaysTool({ tool }: OverlaysToolProps) {
  const download = useStudioDownload()
  const { processedUrl, setProcessedBlob, clearProcessed } =
    useVideoCompareResult()

  return (
    <StudioVideoShell
      tool={tool}
      description="Marca de agua de texto (PNG) sobre el vídeo a pantalla completa."
      compareResultUrl={processedUrl}
      onClearCompare={clearProcessed}
    >
      <OverlayControls
        onProcessed={(blob) => {
          setProcessedBlob(blob)
          download(blob, '-overlay', '.mp4')
        }}
      />
    </StudioVideoShell>
  )
}
