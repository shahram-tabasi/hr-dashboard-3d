import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
const directory = '/app/data'
const imagePath = path.join(directory, 'profile-image')
const metadataPath = path.join(directory, 'profile.json')

export async function GET() {
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as { type: string }
    return NextResponse.json({ url: '/api/profile/image', type: metadata.type })
  } catch {
    return NextResponse.json({ url: null })
  }
}

export async function POST(request: Request) {
  const form = await request.formData()
  const image = form.get('image')
  if (!(image instanceof File) || !image.type.startsWith('image/') || image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'تصویر نامعتبر است یا حجم آن بیشتر از ۵ مگابایت است.' }, { status: 400 })
  }
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  if (!allowed.has(image.type)) return NextResponse.json({ error: 'فرمت تصویر پشتیبانی نمی‌شود.' }, { status: 415 })
  await mkdir(directory, { recursive: true })
  await writeFile(imagePath, Buffer.from(await image.arrayBuffer()))
  await writeFile(metadataPath, JSON.stringify({ type: image.type, updatedAt: new Date().toISOString() }))
  return NextResponse.json({ url: '/api/profile/image' })
}
