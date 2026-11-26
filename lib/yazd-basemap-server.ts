import type { Address, Basemap, Point } from './yazd-basemap'

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

const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
type Failure = { provider: string; reason: string }

export class YazdMapUnavailable extends Error {
  constructor(public readonly failures: Failure[]) {
    super('OpenStreetMap data providers unavailable')
  }
}

function errorCode(error: unknown) {
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object' ? error.cause : null
  const value = cause && 'code' in cause ? cause.code : error instanceof Error ? error.name : 'NetworkError'
  return typeof value === 'string' && /^[a-zA-Z0-9_]{1,48}$/.test(value) ? value : 'NetworkError'
}
let latest: Basemap | undefined
let refreshed = 0
let inFlight: Promise<Basemap> | undefined

async function downloadBasemap(): Promise<Basemap> {
  const params = new URLSearchParams({ data: query })
  const failures: Failure[] = []
  for (const endpoint of endpoints) {
    const provider = new URL(endpoint).hostname
    try {
      const response = await fetch(endpoint + '?' + params, { signal: AbortSignal.timeout(42000), cache: 'no-store' })
      if (!response.ok) {
        failures.push({ provider, reason: 'HTTP ' + response.status })
        await response.body?.cancel().catch(() => {})
        continue
      }
      try {
        return parseBasemap(await response.json())
      } catch {
        failures.push({ provider, reason: 'IncompleteData' })
      }
    } catch (error) {
      failures.push({ provider, reason: errorCode(error) })
    }
  }
  console.warn('[yazd-map] Overpass providers unavailable:', failures.map(({ provider, reason }) => provider + ' ' + reason).join(', '))
  throw new YazdMapUnavailable(failures)
}

function parseBasemap(data: { elements?: OsmElement[]; remark?: string; osm3s?: { timestamp_osm_base?: string } }): Basemap {
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
  return {
    updatedAt: data.osm3s?.timestamp_osm_base || new Date().toISOString(),
    roads,
    places,
  }
}

export async function fetchYazdBasemap() {
  if (latest && Date.now() - refreshed < 15 * 60 * 1000) return latest
  inFlight ??= downloadBasemap().then(data => {
    latest = data
    refreshed = Date.now()
    return data
  }).finally(() => { inFlight = undefined })
  return inFlight
}
