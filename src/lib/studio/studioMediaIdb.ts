const DB_NAME = 'new-meta-remover-studio'
const DB_VERSION = 1
const STORE = 'media'
const KEY = 'current-file'

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

export async function idbGetStudioFile(): Promise<PersistedStudioRecord | null> {
  const db = await openDb()
  try {
    return await new Promise<PersistedStudioRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const r = store.get(KEY)
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

export async function idbPutStudioFile(file: File): Promise<void> {
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
      const store = tx.objectStore(STORE)
      store.put(record, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function idbRemoveStudioFile(): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
