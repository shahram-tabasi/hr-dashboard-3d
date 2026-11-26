import { toJalaali } from 'jalaali-js'

export type Day = { jy: number; jm: number; jd: number }
export type Task = { id: string; day: string; title: string; time: string; done: boolean }
export const storageKey = 'didar-planner-v1'
export function todayInIran(): Day {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(Date.now())
  const read = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return toJalaali(read('year'), read('month'), read('day'))
}

export const taskDayKey = ({ jy, jm, jd }: Day) => `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`

export function readTasks(): Task[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (Array.isArray(saved)) return saved
  } catch { /* An unavailable browser store starts with an empty calendar. */ }
  return []
}
