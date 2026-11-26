import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (process.env.DIDAR_PUBLIC_FEEDBACK_ONLY !== '1') return NextResponse.next()

  const pathname = request.nextUrl.pathname
  const safeMethod = request.method === 'GET' || request.method === 'HEAD'
  if (safeMethod && pathname === '/') {
    const location = request.nextUrl.clone()
    location.pathname = '/feedback'
    return NextResponse.redirect(location)
  }
  if (safeMethod && (pathname === '/feedback' || pathname.startsWith('/_next/static/'))) return NextResponse.next()
  if (request.method === 'POST' && pathname === '/api/feedback') return NextResponse.next()

  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
}
