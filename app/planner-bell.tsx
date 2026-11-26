'use client'

import { useEffect, useState } from 'react'
import { Bell, CalendarDays } from 'lucide-react'
import { readTasks, storageKey, taskDayKey, todayInIran, type Task } from '../lib/planner-data'

export default function PlannerBell({ openCalendar }: { openCalendar: () => void }) {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [today, setToday] = useState('')
  useEffect(() => {
    const refreshDate = () => setToday(taskDayKey(todayInIran()))
    function sync(event: Event) { setTasks((event as CustomEvent<Task[]>).detail) }
    function crossTab(event: StorageEvent) { if (event.key === storageKey) setTasks(readTasks()) }
    setTasks(readTasks())
    refreshDate()
    window.addEventListener('didar-tasks-updated', sync)
    window.addEventListener('storage', crossTab)
    const timer = window.setInterval(refreshDate, 60000)
    return () => {
      window.removeEventListener('didar-tasks-updated', sync)
      window.removeEventListener('storage', crossTab)
      window.clearInterval(timer)
    }
  }, [])
  const reminders = tasks.filter(task => !task.done && task.day === today).sort((a, b) => a.time.localeCompare(b.time))
  return <div className="planner-bell" onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
    <button className="icon-button" aria-label="اعلان‌های تقویم" aria-expanded={open} onClick={() => setOpen(!open)}>
      <Bell size={18}/>{reminders.length > 0 && <span className="bell-count">{reminders.length.toLocaleString('fa-IR')}</span>}
    </button>
    {open && <section className="glass bell-panel" aria-label="یادآوری‌های امروز">
      <h2>یادآوری‌های امروز</h2>
      {reminders.length ? <ul>{reminders.map(task => <li key={task.id}><span>{task.title}</span>{task.time && <time dir="ltr">{task.time}</time>}</li>)}</ul> : <p>کار انجام‌نشده‌ای برای امروز ثبت نشده است.</p>}
      <button className="icon-button" onClick={() => { setOpen(false); openCalendar() }}><CalendarDays size={15}/>رفتن به تقویم</button>
    </section>}
  </div>
}
