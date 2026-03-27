const DB_NAME = 'new-meta-remover-studio'
const DB_VERSION = 1
const STORE = 'media'
/** Only while an encode/transform job is actively running (crash recovery). */
const KEY_PROCESSING = 'processing-active'
/** @deprecated — migrated once to in-memory list, then removed */
const KEY_LEGACY = 'current-file'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export type PersistedStudioRecord = {
  blob: Blob
  name: string
  type: string
  lastModified: number
}

export function fileFromPersisted(p: PersistedStudioRecord): File {
  return new File([p.blob], p.name, {
    type: p.type || 'application/octet-stream',
    lastModified: p.lastModified,
  })
}

async function idbGet(key: string): Promise<PersistedStudioRecord | null> {
  const db = await openDb()
  try {
    return await new Promise<PersistedStudioRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const r = store.get(key)
      r.onsuccess = () => {
        const v = r.result as PersistedStudioRecord | undefined
        resolve(v ?? null)
      }
      r.onerror = () => reject(r.error)
    })
  } finally {
    db.close()
  }
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbPut(key: string, file: File): Promise<void> {
  const db = await openDb()
  const record: PersistedStudioRecord = {
    blob: file.slice(0, file.size, file.type),
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(record, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Snapshot of the file currently being processed (single slot). */
export async function idbPutProcessingFile(file: File): Promise<void> {
  await idbPut(KEY_PROCESSING, file)
}

export async function idbRemoveProcessingFile(): Promise<void> {
  await idbDelete(KEY_PROCESSING)
}

/** One-time migration: old “always persist” key → caller adds to session list. */
export async function idbConsumeLegacyPersistedFile(): Promise<PersistedStudioRecord | null> {
  const rec = await idbGet(KEY_LEGACY)
  if (rec) {
    await idbDelete(KEY_LEGACY)
  }
  return rec
}

/** If the app closed mid-job, recovery blob (optional). */
export async function idbGetProcessingFile(): Promise<PersistedStudioRecord | null> {
  return idbGet(KEY_PROCESSING)
}
