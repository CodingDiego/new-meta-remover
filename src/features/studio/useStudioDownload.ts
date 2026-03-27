import { useCallback } from 'react'

import { buildDownloadFilename } from '@/lib/filename/buildDownloadFilename'
import { useStudioMedia } from '@/features/studio/useStudioMedia'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Download blob using studio filename preferences (Metadatos + vídeo). */
export function useStudioDownload() {
  const { file, nameMode, nameSuffix32 } = useStudioMedia()

  return useCallback(
    (blob: Blob, tag: string, ext?: string) => {
      if (!file) return
      const name = buildDownloadFilename(file.name, {
        mode: nameMode,
        suffix32: nameSuffix32,
        tag,
        ext,
      })
      triggerDownload(blob, name)
    },
    [file, nameMode, nameSuffix32],
  )
}
