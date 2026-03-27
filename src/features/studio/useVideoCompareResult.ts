import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Holds the last processed video blob + object URL for Original / Resultado tabs.
 */
export function useVideoCompareResult() {
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)

  const processedUrl = useMemo(
    () => (processedBlob ? URL.createObjectURL(processedBlob) : null),
    [processedBlob],
  )

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [processedUrl])

  const clearProcessed = useCallback(() => {
    setProcessedBlob(null)
  }, [])

  return {
    processedBlob,
    setProcessedBlob,
    processedUrl,
    clearProcessed,
  }
}
