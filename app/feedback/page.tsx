'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, MessageSquare, Send } from 'lucide-react'

export default function FeedbackPage() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function send(event: FormEvent) {
    event.preventDefault()
    if (pending || !message.trim()) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      const result = await response.json()
      if (!response.ok) { setError(result.error); return }
      setName('')
      setMessage('')
      setSent(true)
    } catch {
      setError('ارتباط با سرور برقرار نشد. دوباره تلاش کنید.')
    } finally {
      setPending(false)
    }
  }

  return <main className="feedback-page">
    <header className="feedback-navigation">
      <span><Image src="/kavir-logo.svg" width={28} height={28} alt=""/>دیدار</span>
      <Link className="icon-button" href="/"><ArrowRight size={15}/>بازگشت به داشبورد</Link>
    </header>
    <section className="panel glass">
      <div className="panel-head"><div><h1>صندوق انتقادات و پیشنهادات</h1><p>پیام شما برای واحد منابع انسانی ارسال می‌شود.</p></div><span className="panel-icon"><MessageSquare size={20}/></span></div>
      {sent ? <div className="feedback-success" role="status">
        <CheckCircle2 size={30}/><strong>پیام در صندوق دیدار ثبت شد.</strong>
        <button className="icon-button" onClick={() => setSent(false)}>نوشتن پیام دیگر</button>
      </div> : <form className="feedback-form" onSubmit={send}>
        <label>نام و نام خانوادگی <small>اختیاری</small><input value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="برای ارسال بدون نام، این قسمت را خالی بگذارید"/></label>
        <label>متن پیام<textarea value={message} maxLength={3000} required rows={7} onChange={event => setMessage(event.target.value)} placeholder="انتقاد یا پیشنهاد خود را بنویسید…"/></label>
        {error && <p className="feedback-error" role="alert">{error}</p>}
        <div className="feedback-submit"><small>{message.length.toLocaleString('fa-IR')} از ۳۰۰۰ نویسه</small><button className="export" disabled={pending || !message.trim()}><Send size={16}/>{pending ? 'در حال ارسال…' : 'ارسال به منابع انسانی'}</button></div>
      </form>}
    </section>
  </main>
}
