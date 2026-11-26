'use client'

import { useState, type FormEvent } from 'react'
import { Check, Inbox, LockKeyhole, RefreshCw } from 'lucide-react'
import type { FeedbackEntry } from '../lib/feedback-store'

const formatDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' })

export default function FeedbackInbox() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [next, setNext] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  async function load(key: string, before?: number) {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback' + (before ? '?before=' + before : ''), { headers: { Authorization: 'Bearer ' + key } })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 401) { setToken(''); setEntries([]) }
        setStatus(result.error)
        return
      }
      setToken(key)
      setPassword('')
      setEntries(current => before ? [...current, ...result.entries] : result.entries)
      setNext(result.next)
    } catch {
      setStatus('ارتباط با کارتابل برقرار نشد.')
    } finally { setBusy(false) }
  }

  async function review(id: number) {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 401) { setToken(''); setEntries([]) }
        setStatus(result.error)
        return
      }
      setEntries(current => current.map(entry => entry.id === id ? { ...entry, reviewedAt: new Date().toISOString() } : entry))
    } catch { setStatus('وضعیت پیام ذخیره نشد.') }
    finally { setBusy(false) }
  }

  function unlock(event: FormEvent) {
    event.preventDefault()
    if (password && !busy) void load(password)
  }

  return <section className="panel glass">
    <div className="panel-head"><div><h2>صندوق انتقادات و پیشنهادات</h2><p>پیام‌های ثبت‌شده از صفحهٔ دیدار</p></div><span className="panel-icon"><Inbox size={20}/></span></div>
    {!token ? <form className="feedback-form feedback-unlock" onSubmit={unlock}>
      <label>رمز کارتابل <input type="password" autoComplete="current-password" value={password} required onChange={event => setPassword(event.target.value)}/></label>
      <button className="export" disabled={busy}><LockKeyhole size={16}/>باز کردن کارتابل</button>
    </form> : <>
      <div className="feedback-inbox-actions">
        <button className="icon-button" disabled={busy} onClick={() => load(token)}><RefreshCw size={16}/>تازه‌سازی</button>
        <button className="icon-button" disabled={busy} onClick={() => { setToken(''); setEntries([]); setNext(null); setStatus('') }}>قفل کارتابل</button>
      </div>
      <div className="feedback-entries">{entries.map(entry => <article key={entry.id}>
        <header><div><strong>{entry.name ?? 'بدون نام'}</strong><small>{formatDate.format(new Date(entry.createdAt))}</small></div><span className="demo">{entry.reviewedAt ? 'بررسی شد' : 'جدید'}</span></header>
        <p>{entry.message}</p>
        {!entry.reviewedAt && <button className="icon-button" disabled={busy} onClick={() => review(entry.id)}><Check size={15}/>علامت‌گذاری به‌عنوان بررسی‌شده</button>}
      </article>)}</div>
      {!entries.length && <p>پیامی ثبت نشده است.</p>}
      {next !== null && <button className="icon-button" disabled={busy} onClick={() => load(token, next)}>پیام‌های قدیمی‌تر</button>}
    </>}
    {status && <p className="feedback-error" role="alert">{status}</p>}
  </section>
}
