import { listFeedback, reviewFeedback, submitFeedback } from '../../../lib/feedback-store'

export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'no-store' }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers })

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
  if (process.env.DIDAR_PUBLIC_FEEDBACK_ONLY === '1') return json({ error: 'یافت نشد.' }, 404)
  const before = Number(new URL(request.url).searchParams.get('before') ?? Number.MAX_SAFE_INTEGER)
  if (!Number.isSafeInteger(before) || before < 1) return json({ error: 'شمارهٔ صفحه معتبر نیست.' }, 400)
  try { return json(listFeedback(before)) } catch { return json({ error: 'صندوق در دسترس نیست.' }, 503) }
}

export async function PATCH(request: Request) {
  if (process.env.DIDAR_PUBLIC_FEEDBACK_ONLY === '1') return json({ error: 'یافت نشد.' }, 404)
  let body
  try { body = await readBody(request) } catch { return json({ error: 'شمارهٔ پیام معتبر نیست.' }, 400) }
  if (!Number.isSafeInteger(body?.id) || body.id < 1) return json({ error: 'شمارهٔ پیام معتبر نیست.' }, 400)
  try {
    return reviewFeedback(body.id) ? json({ reviewed: true }) : json({ error: 'پیام پیدا نشد.' }, 404)
  } catch {
    return json({ error: 'وضعیت پیام ذخیره نشد.' }, 503)
  }
}
