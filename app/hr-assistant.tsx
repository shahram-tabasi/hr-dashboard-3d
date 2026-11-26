'use client'

import { useState, type FormEvent } from 'react'
import { Bot, Send } from 'lucide-react'

const ideas = [
  ['ماندگاری و جابه‌جایی', 'نرخ خروج داوطلبانه و خروج در ۹۰ روز اول را به تفکیک شعبه و واحد پایش کنید.'],
  ['سرعت و کیفیت جذب', 'زمان پر شدن موقعیت، پذیرش پیشنهاد و نتیجهٔ دورهٔ آزمایشی را کنار هم ببینید.'],
  ['بار کار و ریسک فرسودگی', 'اضافه‌کاری، ماندهٔ مرخصی و غیبت را در سطح تیم و در چند دوره مقایسه کنید.'],
  ['توسعه و جانشین‌پروری', 'پوشش جانشین برای نقش‌های کلیدی و اثربخشی آموزش را بسنجید.'],
  ['عدالت پرداخت و رفاه', 'سرانهٔ دریافتی و دسترسی به وام را در گروه‌ها و رتبه‌های شغلی هم‌سطح مقایسه کنید.'],
]
type Turn = { role: 'user' | 'assistant'; content: string }

export default function HRAssistant() {
  const [messages, setMessages] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!question.trim() || busy) return
    const outgoing = [...messages, { role: 'user' as const, content: question.trim() }].slice(-11)
    setMessages(outgoing)
    setQuestion('')
    setStatus('')
    setBusy(true)
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: outgoing }) })
      const result = await response.json()
      if (!response.ok) { setStatus(result.error); return }
      setMessages([...outgoing, { role: 'assistant', content: result.answer }])
    } catch {
      setStatus('دسترسی به دستیار برقرار نشد.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="hr-analytics">
    <section className="panel glass">
      <div className="panel-head"><div><h2>دستیار محلی منابع انسانی</h2><p>پرسش دربارهٔ روندها، شاخص‌ها و اقدامات بهبود</p></div><Bot size={21}/></div>
      <div className="chat-history" aria-live="polite">{messages.map((item, index) => <p key={index} className={item.role}><strong>{item.role === 'user' ? 'شما' : 'دستیار'}</strong>{item.content}</p>)}</div>
      {status && <p role="status">{status}</p>}
      <form className="catalog-filters chat-form" onSubmit={send}><input aria-label="پرسش منابع انسانی" maxLength={2200} placeholder="برای کاهش اضافه‌کاری از کجا شروع کنیم؟" value={question} onChange={event => setQuestion(event.target.value)} required/><button className="export"><Send size={15}/>{busy ? 'در حال پاسخ' : 'ارسال'}</button></form>
    </section>
    <section className="panel glass"><div className="panel-head"><div><h2>شاخص‌های پیشنهادی برای مدیر منابع انسانی</h2></div></div>
      <div className="org-grid">{ideas.map(([title, text]) => <article key={title} className="org-node"><h3>{title}</h3><small>{text}</small></article>)}</div>
    </section>
  </div>
}
