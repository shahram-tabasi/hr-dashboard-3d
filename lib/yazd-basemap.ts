export type Point = [lat: number, lng: number]
export type Address = { point: Point; label: string }
export type Basemap = {
  updatedAt: string
  roads: { points: Point[]; kind: string; name?: string }[]
  places: Address[]
}

const cacheName = 'didar-offline-yazd-v1'
const cacheEntry = '/offline-yazd-basemap.json'
function accessStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(cacheName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('map')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('map', mode)
      const action = operation(transaction.objectStore('map'))
      transaction.oncomplete = () => { db.close(); resolve(action.result) }
      transaction.onabort = () => { db.close(); reject(transaction.error) }
    }
  })
}

export async function readBasemap(): Promise<Basemap | null> {
  const saved = await accessStore<Basemap | undefined>('readonly', store => store.get(cacheEntry))
  if (saved) return saved
  if (!('caches' in window)) return null
  const cache = await caches.open(cacheName)
  const previous = await cache.match(cacheEntry)
  return previous ? previous.json() : null
}

export async function updateBasemap(): Promise<{ basemap: Basemap; saved: boolean }> {
  const response = await fetch('/api/yazd-map', { method: 'POST', signal: AbortSignal.timeout(95000) })
  if (!response.ok) throw new Error('Map download failed')
  const basemap: Basemap = await response.json()
  if (!basemap.roads.length) throw new Error('No streets returned')
  try {
    await accessStore('readwrite', store => store.put(basemap, cacheEntry))
    return { basemap, saved: true }
  } catch {
    return { basemap, saved: false }
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFKC').replaceAll('ي', 'ی').replaceAll('ك', 'ک').replace(/[\u200c\s]+/g, ' ')
}

export function searchBasemap(basemap: Basemap, term: string): Address[] {
  const words = normalize(term).split(' ').filter(word => word !== 'یزد')
  if (!words.length) return []
  const matches = (label: string) => words.every(word => normalize(label).includes(word))
  const found = new Map<string, Address>()
  for (const place of basemap.places) {
    if (matches(place.label)) found.set(place.label, place)
    if (found.size === 5) return [...found.values()]
  }
  for (const { name, points } of basemap.roads) {
    if (name && matches(name) && !found.has(name)) found.set(name, { label: name, point: points[Math.floor(points.length / 2)] })
    if (found.size === 5) break
  }
  return [...found.values()]
}
