export type ArchiveCategory = 'license' | 'cv' | 'experience_certificate' | 'training_certificate'

export type ArchiveEntry = {
  id: string
  name: string
  category: ArchiveCategory
  owner: string
  createdAt: string
  type: string
  blob: Blob
}

const DB_NAME = 'hazar-job-private-archive'
const STORE_NAME = 'documents'

function openArchive(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function archiveFile(file: File, category: ArchiveCategory, owner: string) {
  const database = await openArchive()
  const entry: ArchiveEntry = {
    id: `${category}-${Date.now()}-${file.name}`,
    name: file.name,
    category,
    owner,
    createdAt: new Date().toISOString(),
    type: file.type,
    blob: file,
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(entry)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
  return entry
}

export async function listArchive(): Promise<ArchiveEntry[]> {
  const database = await openArchive()
  const entries = await new Promise<ArchiveEntry[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteArchivedFile(id: string) {
  const database = await openArchive()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export function downloadArchivedFile(entry: ArchiveEntry) {
  const url = URL.createObjectURL(entry.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = entry.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
