import { peopleAt, unitStats } from '../../../lib/people'

type Turn = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  const endpoint = process.env.LOCAL_MODEL_URL
  const model = process.env.LOCAL_MODEL_NAME
  if (!endpoint || !model) return Response.json({ error: 'دستیار محلی هنوز در سرور تنظیم نشده است.' }, { status: 503 })
  try {
    const body = await request.json()
    const messages: unknown = body?.messages
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12 ||
        !messages.every((turn: Turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string' && turn.content.length <= 2200) ||
        messages.at(-1).role !== 'user') {
      return Response.json({ error: 'پیام معتبر نیست.' }, { status: 400 })
    }
    const aggregate = unitStats(peopleAt('همه شعب')).map(unit => ({
      unit: unit.name, headcount: unit.members.length, women: unit.women, students: unit.students,
    }))
    const token = process.env.LOCAL_MODEL_KEY
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({
        model, stream: false, max_tokens: 900,
        messages: [{ role: 'system', content: 'دستیار فارسی منابع انسانی هستی. فقط برای تحلیل فرایند و پیشنهاد اقدام قابل سنجش کمک کن. داده پیوست کاملاً نمونه است. درباره افراد تصمیم یا حدس نزن و کمبود داده را مشخص کن. زمینه تجمیعی: ' + JSON.stringify(aggregate) }, ...messages.map(({ role, content }: Turn) => ({ role, content }))],
      }),
      signal: AbortSignal.timeout(45000),
    })
    if (!response.ok) throw new Error('Local model unavailable')
    const result = await response.json()
    const answer = result?.choices?.[0]?.message?.content
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('Invalid model response')
    return Response.json({ answer })
  } catch {
    return Response.json({ error: 'پاسخ دستیار محلی دریافت نشد. دسترسی سرور به مدل را بررسی کنید.' }, { status: 502 })
  }
}
