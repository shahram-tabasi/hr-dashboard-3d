export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    url: process.env.FEEDBACK_PUBLIC_URL ?? '',
    port: process.env.FEEDBACK_PUBLIC_PORT ?? '',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
