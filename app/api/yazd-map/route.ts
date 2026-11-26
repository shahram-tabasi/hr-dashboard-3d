import { fetchYazdBasemap } from '../../../lib/yazd-basemap-server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    return Response.json(await fetchYazdBasemap())
  } catch {
    return Response.json({ error: 'Yazd map provider unavailable' }, { status: 503 })
  }
}
