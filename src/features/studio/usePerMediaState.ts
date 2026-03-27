import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Keeps a separate value per studio media id so tool params do not leak across files.
 * `defaultValue` should be stable (primitive or module-level constant).
 */
export function usePerMediaState<T>(
  mediaId: string | null,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [store, setStore] = useState(() => new Map<string, T>())

  const value: T =
    mediaId !== null && store.has(mediaId)
      ? store.get(mediaId)!
      : defaultValue

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      if (mediaId === null) return
      setStore((prev) => {
        const prevVal = prev.has(mediaId) ? prev.get(mediaId)! : defaultValue
        const next =
          typeof action === 'function'
            ? (action as (p: T) => T)(prevVal)
            : action
        const copy = new Map(prev)
        copy.set(mediaId, next)
        return copy
      })
    },
    [mediaId, defaultValue],
  )

  return [value, setValue]
}
