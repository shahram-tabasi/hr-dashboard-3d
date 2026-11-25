import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const [bytes, metadata] = await Promise.all([
      readFile('/app/data/profile-image'),
      readFile('/app/data/profile.json', 'utf8'),
    ])
    const { type } = JSON.parse(metadata) as { type: string }
    return new NextResponse(new Uint8Array(bytes), {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    return new NextResponse('تصویر پروفایل ثبت نشده است.', { status: 404 })
  }
}
