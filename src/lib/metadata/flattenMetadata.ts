/** Flatten nested metadata objects into dot-path keys for display. */
export function flattenMetadata(
  obj: unknown,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {}
  if (obj === null || obj === undefined) return result
  if (
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean'
  ) {
    if (prefix) result[prefix] = String(obj)
    return result
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      Object.assign(
        result,
        flattenMetadata(v, prefix ? `${prefix}.${i}` : String(i)),
      )
    })
    return result
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        !(v instanceof Blob)
      ) {
        Object.assign(result, flattenMetadata(v, key))
      } else if (v !== undefined && v !== null) {
        result[key] = String(v)
      }
    }
  }
  return result
}
