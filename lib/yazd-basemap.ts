export type Point = [lat: number, lng: number]
export type Address = { point: Point; label: string }
export type Basemap = {
  updatedAt: string
  roads: { points: Point[]; kind: string; name?: string }[]
  places: Address[]
}

const cacheName = 'didar-offline-yazd-v1'
const cacheEntry = '/offline-yazd-basemap.json'
const bounds = '31.81,54.27,31.96,54.46'
const query = `[out:json][timeout:35];(
  way["highway"](${bounds});
  node["name"]["tourism"](${bounds});
  node["name"]["amenity"](${bounds});
  node["addr:housenumber"]["addr:street"](${bounds});
);out geom;`

type OsmElement = {
  type: string
  lat?: number
  lon?: number
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

export async function readBasemap(): Promise<Basemap | null> {
  const cache = await caches.open(cacheName)
  const response = await cache.match(cacheEntry)
  return response ? response.json() : null
}

export async function updateBasemap(): Promise<Basemap> {
  const params = new URLSearchParams({ data: query })
  const response = await fetch('https://overpass-api.de/api/interpreter?' + params, { signal: AbortSignal.timeout(50000) })
  if (!response.ok) throw new Error('Map download failed')
  const data: { elements?: OsmElement[]; remark?: string; osm3s?: { timestamp_osm_base?: string } } = await response.json()
  if (data.remark || !Array.isArray(data.elements)) throw new Error('Map download incomplete')

  const roads: Basemap['roads'] = []
  const places: Address[] = []
  for (const element of data.elements) {
    const tags = element.tags ?? {}
    const name = tags['name:fa'] || tags.name
    if (element.type === 'way' && tags.highway && (element.geometry?.length ?? 0) >= 2) {
      const points: Point[] = element.geometry!.map(({ lat, lon }) => [lat, lon])
      if (points.every(point => point.every(Number.isFinite))) roads.push({ points, kind: tags.highway, name })
    }
    if (element.type === 'node' && typeof element.lat === 'number' && typeof element.lon === 'number') {
      const label = name || [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join('، ')
      if (label) places.push({ point: [element.lat, element.lon], label })
    }
  }
  if (!roads.length) throw new Error('No streets returned')
  const basemap = {
    updatedAt: data.osm3s?.timestamp_osm_base || new Date().toISOString(),
    roads,
    places,
  }
  const cache = await caches.open(cacheName)
  await cache.put(cacheEntry, new Response(JSON.stringify(basemap), {
    headers: { 'content-type': 'application/json' },
  }))
  return basemap
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
