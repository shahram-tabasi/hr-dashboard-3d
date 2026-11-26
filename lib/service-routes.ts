import type { Point } from './yazd-basemap'

export type Route = { name?: string; count: number; points: Point[]; standing?: number; snap?: number }
export const routeStorageKey = 'didar-yazd-service-routes-v1'
const routeColors = ['#ccb1ff', '#86e0f7', '#ffb5d1', '#fbd17f', '#a5e8b6', '#ffa489', '#a9bcff']
export function routeColor(index: number) {
  return routeColors[index] ?? `hsl(${Math.round(index * 137.508) % 360} 72% 71%)`
}

export function routeName(route: Route | undefined, index: number) {
  return route?.name?.trim() || 'سرویس ' + (index + 1).toLocaleString('fa-IR')
}

const terminal: Point = [31.919, 54.393]
const sample: Route[] = [
  { count: 19, points: [[31.933, 54.328], [31.928, 54.355], [31.927, 54.380], terminal] },
  { count: 23, points: [[31.900, 54.314], [31.903, 54.336], [31.908, 54.349], [31.924, 54.376], terminal] },
  { count: 15, points: [[31.892, 54.356], [31.900, 54.362], [31.908, 54.372], terminal] },
  { count: 21, points: [[31.860, 54.325], [31.875, 54.341], [31.891, 54.341], [31.909, 54.352], terminal] },
  { count: 17, points: [[31.858, 54.367], [31.874, 54.370], [31.890, 54.380], [31.905, 54.387], terminal] },
  { count: 14, points: [[31.870, 54.423], [31.889, 54.412], [31.903, 54.403], terminal] },
  { count: 18, points: [[31.925, 54.430], [31.922, 54.409], terminal] },
]

export function readRoutes(): Route[] {
  try {
    const saved = JSON.parse(localStorage.getItem(routeStorageKey) ?? 'null') as Route[] | null
    if (Array.isArray(saved) && saved.length > 0 && saved.every(route =>
      route && (route.name === undefined || typeof route.name === 'string') && Number.isSafeInteger(route.count) && route.count >= 0 &&
      Array.isArray(route.points) && route.points.length >= 2 &&
      route.points.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)),
    )) return saved
  } catch { /* A missing or invalid local draft falls back to the demo. */ }
  return sample
}
