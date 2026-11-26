'use client'

import { useState, type FormEvent } from 'react'
import { readTasks, storageKey, taskDayKey as dayKey, todayInIran, type Day, type Task } from '../lib/planner-data'
import { getIranHolidays } from '@avan-persian/holidays'
import { jalaaliMonthLength, toGregorian } from 'jalaali-js'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Pencil, Plus, Trash2 } from 'lucide-react'

const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
const fa = (value: number) => value.toLocaleString('fa-IR', { useGrouping: false })
const pad = (value: number) => String(value).padStart(2, '0')
function weekday({ jy, jm, jd }: Day) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return (new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay() + 1) % 7
}

export default function Planner() {
  const [today] = useState(todayInIran)
  const [day, setDay] = useState(today)
  const [tasks, setTasks] = useState(readTasks)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [storageMessage, setStorageMessage] = useState('')
  const selectedKey = dayKey(day)
  const holidays = new Map(getIranHolidays(day.jy).map(holiday => [holiday.date, holiday]))
  const daily = tasks.filter(task => task.day === selectedKey).sort((a, b) => a.time.localeCompare(b.time))
  const taskDays = new Set(tasks.map(task => task.day))

  function select(date: Day) {
    setDay(date)
    setEditing(null)
    setTitle('')
    setTime('')
  }

  function shiftMonth(step: number) {
    const monthIndex = day.jy * 12 + day.jm - 1 + step
    const jy = Math.floor(monthIndex / 12)
    const jm = monthIndex % 12 + 1
    select({ jy, jm, jd: Math.min(day.jd, jalaaliMonthLength(jy, jm)) })
  }

  function save(updated: Task[]) {
    setTasks(updated)
    window.dispatchEvent(new CustomEvent('didar-tasks-updated', { detail: updated }))
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      setStorageMessage('')
    } catch {
      setStorageMessage('ذخیره در مرورگر در دسترس نیست. تغییرات برای همین جلسه حفظ می‌شوند.')
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = title.trim()
    if (!name) return
    save(editing
      ? tasks.map(task => task.id === editing ? { ...task, title: name, time } : task)
      : [...tasks, { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, day: selectedKey, title: name, time, done: false }])
    select(day)
  }

  function exportDay() {
    const { gy, gm, gd } = toGregorian(day.jy, day.jm, day.jd)
    const date = `${gy}${pad(gm)}${pad(gd)}`
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
    const escapeText = (text: string) => text.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Didar//Daily Planner//FA']
    for (const task of daily) {
      const [hour, minute] = task.time.split(':').map(Number)
      const utc = new Date(Date.UTC(gy, gm - 1, gd, hour - 3, minute - 30))
      const start = task.time
        ? 'DTSTART:' + utc.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
        : 'DTSTART;VALUE=DATE:' + date
      lines.push('BEGIN:VEVENT', 'UID:' + task.id + '@didar', 'DTSTAMP:' + stamp, start, 'SUMMARY:' + escapeText(task.title), 'END:VEVENT')
    }
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\nEND:VCALENDAR\r\n'], { type: 'text/calendar;charset=utf-8' }))
    link.href = url
    link.download = `didar-${selectedKey}.ics`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="planner-layout">
    <section className="panel glass">
      <div className="panel-head">
        <div><h2>{months[day.jm - 1]} {fa(day.jy)}</h2><p>تقویم شمسی · تعطیلات رسمی ایران و جمعه‌ها</p></div>
        <div className="planner-controls">
          <button className="icon-button" aria-label="ماه قبل" onClick={() => shiftMonth(-1)}><ChevronRight size={17}/></button>
          <button className="icon-button" onClick={() => select(today)}>امروز</button>
          <button className="icon-button" aria-label="ماه بعد" onClick={() => shiftMonth(1)}><ChevronLeft size={17}/></button>
        </div>
      </div>
      {(day.jy < 1404 || day.jy > 1406) && <p className="planner-note">برای این سال، جمعه‌ها و تعطیلات ثابت شمسی نمایش داده می‌شوند. مجموعهٔ تعطیلات سالانه برای ۱۴۰۴ تا ۱۴۰۶ در دسترس است.</p>}
      <div className="month-grid">
        {weekdays.map(name => <span className="weekday" key={name}>{name}</span>)}
        {Array.from({ length: weekday({ ...day, jd: 1 }) }, (_, i) => <span key={'blank-' + i}/>)}
        {Array.from({ length: jalaaliMonthLength(day.jy, day.jm) }, (_, i) => {
          const date = { ...day, jd: i + 1 }
          const key = dayKey(date)
          const holiday = holidays.get(key)
          const friday = weekday(date) === 6
          const label = `${fa(date.jd)} ${months[date.jm - 1]}${holiday ? '، ' + holiday.title : friday ? '، تعطیل هفتگی' : ''}`
          return <button key={key} className={holiday || friday ? 'calendar-day holiday' : 'calendar-day'} title={holiday?.title} aria-label={label} aria-pressed={key === selectedKey} aria-current={key === dayKey(today) ? 'date' : undefined} onClick={() => select(date)}>
            <strong>{fa(date.jd)}</strong>{holiday && <small>{holiday.title}{holiday.tentative ? ' (موقت)' : ''}</small>}{taskDays.has(key) && <i aria-hidden="true"/>}
          </button>
        })}
      </div>
    </section>
    <section className="panel glass">
      <div className="panel-head"><div><h2>برنامهٔ روزانه</h2><p>{weekdays[weekday(day)]} {fa(day.jd)} {months[day.jm - 1]} {fa(day.jy)}</p></div><span className="panel-icon"><CalendarDays size={19}/></span></div>
      {(holidays.has(selectedKey) || weekday(day) === 6) && <p className="planner-holiday">{holidays.get(selectedKey)?.title ?? 'تعطیل هفتگی'}</p>}
      <form className="planner-form" onSubmit={submit}>
        <input aria-label="عنوان کار" placeholder="عنوان کار" value={title} maxLength={120} required onChange={event => setTitle(event.target.value)}/>
        <div>
          <label>ساعت تهران <input aria-label="ساعت کار" type="time" value={time} onChange={event => setTime(event.target.value)}/></label>
          <button className="export"><Plus size={15}/>{editing ? 'ذخیره' : 'افزودن کار'}</button>
          {editing && <button className="icon-button" type="button" onClick={() => select(day)}>لغو</button>}
        </div>
      </form>
      {storageMessage && <p role="status" className="planner-note">{storageMessage}</p>}
      {daily.length ? <ul className="planner-tasks">{daily.map(task => <li key={task.id}>
        <label><input type="checkbox" checked={task.done} onChange={event => save(tasks.map(item => item.id === task.id ? { ...item, done: event.target.checked } : item))}/><span>{task.title}{task.time && <small> · <b dir="ltr">{task.time}</b></small>}</span></label>
        <button className="icon-button" aria-label={'ویرایش ' + task.title} onClick={() => { setEditing(task.id); setTitle(task.title); setTime(task.time) }}><Pencil size={14}/></button>
        <button className="icon-button" aria-label={'حذف ' + task.title} onClick={() => { save(tasks.filter(item => item.id !== task.id)); if (editing === task.id) select(day) }}><Trash2 size={14}/></button>
      </li>)}</ul> : <p className="planner-note">برای این روز کاری ثبت نشده است.</p>}
      {daily.length > 0 && <button className="icon-button calendar-download" onClick={exportDay}><Download size={15}/>خروجی کلندر</button>}
    </section>
  </div>
}
