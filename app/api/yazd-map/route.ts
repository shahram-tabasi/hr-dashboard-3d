import { fetchYazdBasemap, YazdMapUnavailable } from '../../../lib/yazd-basemap-server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    return Response.json(await fetchYazdBasemap())
  } catch (error) {
    const failures = error instanceof YazdMapUnavailable ? error.failures : []
    return Response.json({ error: 'Yazd map provider unavailable', failures }, { status: 503 })
  }
}
