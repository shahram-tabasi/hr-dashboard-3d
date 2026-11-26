export type Point = [lat: number, lng: number]
export type Address = { point: Point; label: string }
export type Basemap = {
  updatedAt: string
  roads: { points: Point[]; kind: string; name?: string }[]
  places: Address[]
  roadCenters?: Point[]
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

export async function readBasemap(): Promise<Basemap> {
  try {
    const saved = await accessStore<Basemap | undefined>('readonly', store => store.get(cacheEntry))
    if (saved?.roads.length) return saved
  } catch { /* The bundled map works even when browser storage is unavailable. */ }
  if ('caches' in window) {
    try {
      const cache = await caches.open(cacheName)
      const previous = await cache.match(cacheEntry)
      if (previous) {
        const map: Basemap = await previous.json()
        if (map.roads.length) return map
      }
    } catch { /* Continue with the bundled map. */ }
  }
  const response = await fetch('/maps/yazd-street-index.json')
  if (!response.ok) throw new Error('Bundled map unavailable')
  return response.json()
}

async function saveBasemap(basemap: Basemap) {
  try {
    await accessStore('readwrite', store => store.put(basemap, cacheEntry))
    return { basemap, saved: true }
  } catch {
    return { basemap, saved: false }
  }
}

export async function updateBasemap() {
  const response = await fetch('/api/yazd-map', { method: 'POST', signal: AbortSignal.timeout(95000) })
  if (!response.ok) throw new Error('Map download failed')
  const basemap: Basemap = await response.json()
  if (!basemap.roads.length) throw new Error('No streets returned')
  return saveBasemap(basemap)
}

type Geometry = { type?: string; coordinates?: unknown }

function pointFromGeoJSON(coordinates: unknown): Point | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const [lng, lat] = coordinates
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
}

function inYazd([lat, lng]: Point) {
  return lat >= 31.79 && lat <= 32.02 && lng >= 54.23 && lng <= 54.54
}

export async function importYazdMap(file: File) {
  if (file.size > 32 * 1024 * 1024) throw new Error('Map file too large')
  const source = JSON.parse(await file.text())
  if (source?.type !== 'FeatureCollection' || !Array.isArray(source.features)) throw new Error('GeoJSON feature collection required')
  const roads: Basemap['roads'] = []
  const places: Address[] = []
  for (const feature of source.features) {
    const geometry: Geometry | undefined = feature?.geometry
    const props = feature?.properties
    const name = props?.['name:fa'] ?? props?.name
    const label = typeof name === 'string' ? name : undefined
    if (geometry?.type === 'Point' && label) {
      const point = pointFromGeoJSON(geometry.coordinates)
      if (point && inYazd(point)) places.push({ label, point })
    }
    if (geometry?.type === 'LineString' || geometry?.type === 'MultiLineString') {
      const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
      if (!Array.isArray(lines)) continue
      for (const line of lines) {
        if (!Array.isArray(line)) continue
        const points = line.map(pointFromGeoJSON)
        if (points.length >= 2 && points.every(point => point !== null) && points.some(inYazd)) {
          roads.push({ points, kind: typeof props?.highway === 'string' ? props.highway : 'road', name: label })
        }
      }
    }
  }
  if (!roads.length) throw new Error('No street geometry in Yazd')
  return saveBasemap({ updatedAt: new Date().toISOString(), roads, places })
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
