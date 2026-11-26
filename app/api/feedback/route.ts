import { createHash, timingSafeEqual } from 'node:crypto'
import { listFeedback, reviewFeedback, submitFeedback } from '../../../lib/feedback-store'

export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'no-store' }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers })

function authorization(request: Request) {
  const secret = process.env.HR_INBOX_PASSWORD
  if (!secret) return json({ error: 'رمز کارتابل هنوز روی سرور تنظیم نشده است.' }, 503)
  const auth = request.headers.get('authorization') ?? ''
  const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const hash = (value: string) => createHash('sha256').update(value).digest()
  if (!supplied || !timingSafeEqual(hash(supplied), hash(secret))) return json({ error: 'رمز کارتابل درست نیست.' }, 401)
}

async function readBody(request: Request) {
  const stream = request.body?.getReader()
  if (!stream) throw new Error('Empty body')
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  while (true) {
    const { value, done } = await stream.read()
    if (done) break
    size += value.length
    if (size > 24_000) {
      await stream.cancel()
      throw new Error('Body exceeds limit')
    }
    text += decoder.decode(value, { stream: true })
  }
  return JSON.parse(text + decoder.decode())
}

export async function POST(request: Request) {
  let body
  try { body = await readBody(request) } catch { return json({ error: 'متن پیام معتبر نیست.' }, 400) }
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (name.length > 100 || !message || message.length > 3000) {
    return json({ error: 'متن پیام لازم است و حداکثر ۳۰۰۰ نویسه می‌تواند داشته باشد.' }, 400)
  }
  try {
    submitFeedback(name || null, message)
    return json({ received: true }, 201)
  } catch {
    return json({ error: 'پیام ذخیره نشد. لطفاً دوباره تلاش کنید.' }, 503)
  }
}

export function GET(request: Request) {
  const failure = authorization(request)
  if (failure) return failure
  const before = Number(new URL(request.url).searchParams.get('before') ?? Number.MAX_SAFE_INTEGER)
  if (!Number.isSafeInteger(before) || before < 1) return json({ error: 'شمارهٔ صفحه معتبر نیست.' }, 400)
  try { return json(listFeedback(before)) } catch { return json({ error: 'کارتابل در دسترس نیست.' }, 503) }
}

export async function PATCH(request: Request) {
  const failure = authorization(request)
  if (failure) return failure
  let body
  try { body = await readBody(request) } catch { return json({ error: 'شمارهٔ پیام معتبر نیست.' }, 400) }
  if (!Number.isSafeInteger(body?.id) || body.id < 1) return json({ error: 'شمارهٔ پیام معتبر نیست.' }, 400)
  try {
    return reviewFeedback(body.id) ? json({ reviewed: true }) : json({ error: 'پیام پیدا نشد.' }, 404)
  } catch {
    return json({ error: 'وضعیت پیام ذخیره نشد.' }, 503)
  }
}
