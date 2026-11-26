'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Inbox, RefreshCw } from 'lucide-react'
import type { FeedbackEntry } from '../lib/feedback-store'

const formatDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' })

export default function FeedbackInbox() {
  const [formLink, setFormLink] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const linkInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fallback = new URL('/feedback', window.location.origin)
    fetch('/api/feedback/link').then(async response => {
      if (!response.ok) throw new Error('Link unavailable')
      const { url, port } = await response.json()
      if (url) {
        const configured = new URL(url)
        if (configured.protocol === 'http:' || configured.protocol === 'https:') return configured.href
      }
      if (port) fallback.port = port
      return fallback.href
    }).then(setFormLink).catch(() => setCopyStatus('لینک فرم کارکنان در دسترس نیست.'))
    void load()
  }, [])

  async function copyFormLink() {
    try {
      await navigator.clipboard.writeText(formLink)
      setCopyStatus('لینک فرم کارکنان کپی شد.')
    } catch {
      linkInput.current?.focus()
      linkInput.current?.select()
      setCopyStatus('لینک انتخاب شد. آن را با گزینهٔ کپی مرورگر بردارید.')
    }
  }

  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [next, setNext] = useState<number | null>(null)
  const [busy, setBusy] = useState(true)
  const [status, setStatus] = useState('')

  async function load(before?: number) {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback' + (before ? '?before=' + before : ''))
      const result = await response.json()
      if (!response.ok) {
        setStatus(result.error)
        return
      }
      setEntries(current => before ? [...current, ...result.entries] : result.entries)
      setNext(result.next)
    } catch {
      setStatus('ارتباط با صندوق برقرار نشد.')
    } finally { setBusy(false) }
  }

  async function review(id: number) {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (!response.ok) {
        setStatus(result.error)
        return
      }
      setEntries(current => current.map(entry => entry.id === id ? { ...entry, reviewedAt: new Date().toISOString() } : entry))
    } catch { setStatus('وضعیت پیام ذخیره نشد.') }
    finally { setBusy(false) }
  }

  return <section className="panel glass">
    <div className="panel-head"><div><h2>صندوق انتقادات و پیشنهادات</h2><p>پیام‌های ثبت‌شده از صفحهٔ دیدار</p></div><span className="panel-icon"><Inbox size={20}/></span></div>
    <div className="feedback-share">
      <label htmlFor="employee-feedback-link">لینک فرم کارکنان</label>
      <div><input id="employee-feedback-link" ref={linkInput} value={formLink} dir="ltr" readOnly/>
        <button className="icon-button" disabled={!formLink} onClick={copyFormLink}><Copy size={15}/>کپی لینک</button></div>
      <small role="status">{copyStatus}</small>
    </div>
    <div className="feedback-inbox-actions">
      <button className="icon-button" disabled={busy} onClick={() => load()}><RefreshCw size={16}/>تازه‌سازی</button>
    </div>
      <div className="feedback-entries">{entries.map(entry => <article key={entry.id}>
        <header><div><strong>{entry.name ?? 'بدون نام'}</strong><small>{formatDate.format(new Date(entry.createdAt))}</small></div><span className="demo">{entry.reviewedAt ? 'بررسی شد' : 'جدید'}</span></header>
        <p>{entry.message}</p>
        {!entry.reviewedAt && <button className="icon-button" disabled={busy} onClick={() => review(entry.id)}><Check size={15}/>علامت‌گذاری به‌عنوان بررسی‌شده</button>}
      </article>)}</div>
      {!entries.length && !status && <p>{busy ? 'در حال دریافت پیام‌ها…' : 'پیامی ثبت نشده است.'}</p>}
      {next !== null && <button className="icon-button" disabled={busy} onClick={() => load(next)}>پیام‌های قدیمی‌تر</button>}
    {status && <p className="feedback-error" role="alert">{status}</p>}
  </section>
}
