import {
  useCallback,
  useReducer,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'

/**
 * Keeps a separate value per studio media id so tool params do not leak across files.
 * `defaultValue` should be stable (primitive or module-level constant).
 */
export function usePerMediaState<T>(
  mediaId: string | null,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const storeRef = useRef(new Map<string, T>())
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  if (mediaId !== null && !storeRef.current.has(mediaId)) {
    storeRef.current.set(mediaId, defaultValue)
  }

  const value: T =
    mediaId !== null && storeRef.current.has(mediaId)
      ? storeRef.current.get(mediaId)!
      : defaultValue

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      if (mediaId === null) return
      const prev = storeRef.current.get(mediaId) ?? defaultValue
      const next =
        typeof action === 'function'
          ? (action as (prev: T) => T)(prev)
          : action
      storeRef.current.set(mediaId, next)
      rerender()
    },
    [mediaId, defaultValue],
  )

  return [value, setValue]
}
