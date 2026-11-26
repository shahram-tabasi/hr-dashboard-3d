import { taskDayKey, todayInIran, type Day } from './planner-data'

export const loanTypes = ['امتیازی', 'ضروری', 'کوتاه‌مدت شرکت'] as const
export type Loan = { type: LoanType; status: 'پرداخت‌شده' | 'در نوبت'; amount: number; date: string }
export type LoanType = typeof loanTypes[number]
export type Branch = 'تهران' | 'یزد'
export const orgUnits = [
  { name: 'فروش', children: ['مهندسی فروش', 'فروش'], tehran: 49, yazd: 16 },
  { name: 'فنی و پروژه‌ها', children: ['اجرایی پروژه', 'مدیریت پروژه', 'فنی و مهندسی', 'کنترل پروژه', 'مدیریت Close Out'], tehran: 26, yazd: 26 },
  { name: 'توسعه کسب‌وکار', children: ['توسعه بازار', 'توسعه محصول', 'مدیریت طرح‌ها', 'آرمان تدبیر'], tehran: 15, yazd: 4 },
  { name: 'بازرگانی و تأمین تجهیزات', children: ['خرید داخلی', 'بازرگانی خارجی', 'خرید خدمات', 'سورسینگ'], tehran: 19, yazd: 13 },
  { name: 'امور مالی', children: ['انبار', 'حسابداری', 'تأمین منابع مالی', 'حسابداری صنعتی', 'مدیریت دارایی‌ها'], tehran: 31, yazd: 14 },
  { name: 'سرمایه انسانی', children: ['رشد و توسعه', 'کارگزینی', 'پشتیبانی', 'حراست', 'IT'], tehran: 25, yazd: 10 },
  { name: 'تولید و عملیات', children: ['ساخت', 'مونتاژ MV-LV', 'PM', 'رنگ و آبکاری'], tehran: 0, yazd: 92 },
  { name: 'TQMS', children: ['HSE', 'QC', 'رهگیری راهبرد', 'QA', 'BPMS', 'AI'], tehran: 11, yazd: 16 },
  { name: 'خدمات مشتریان', children: ['فروش قطعات', 'گارانتی و پشتیبانی', 'الکترو تدبیر'], tehran: 13, yazd: 5 },
  { name: 'راهبرد و نظارت', children: ['کمیته‌های راهبردی', 'دفتر نظارت و پایش پروژه‌ها'], tehran: 10, yazd: 0 },
  { name: 'امور حقوقی و قراردادها', children: [], tehran: 5, yazd: 0 },
]

export const money = (value: number) => value.toLocaleString('fa-IR')
export const sum = <T,>(rows: T[], value: (item: T) => number) => rows.reduce((total, row) => total + value(row), 0)
export const percent = (part: number, total: number) => total ? Math.round(1000 * part / total) / 10 : 0

function monthDate(now: Day, offset: number, day: number) {
  const month = now.jm - 1 + offset
  return taskDayKey({ jy: now.jy + Math.floor(month / 12), jm: month % 12 + 1, jd: day })
}

function makeDemoPeople(now: Day) {
  let id = 0
  return orgUnits.flatMap((unit, unitIndex) => (['تهران', 'یزد'] as const).flatMap(city => {
    const count = city === 'تهران' ? unit.tehran : unit.yazd
    return Array.from({ length: count }, (_, index) => {
      id += 1
      const key = id
      const gender = (unitIndex !== 10 && (index + unitIndex * 2) % (unitIndex === 6 ? 7 : 3) === 0) ? 'زن' : 'مرد'
      const group = ((key * 7) % 17) + 1
      const rank = 1 + (key * 3 % 5)
      const loans = loanTypes.flatMap<Loan>((type, typeIndex) => {
        const flag = (key + typeIndex * 11) % (7 + typeIndex)
        const offset = [0, 1, 3, 5, 9, 12][key % 6]
        if (flag <= 1) return [{ type, status: 'پرداخت‌شده' as const, amount: [85, 50, 30][typeIndex] * 1_000_000, date: monthDate(now, offset, 7 + (key % 16)) }]
        if (flag === 2) return [{ type, status: 'در نوبت' as const, amount: [85, 50, 30][typeIndex] * 1_000_000, date: monthDate(now, offset, 4 + (key % 20)) }]
        return []
      })
      return {
        id: key, name: 'همکار نمونه ' + String(key).padStart(3, '0'), city, unit: unit.name,
        team: unit.children[index % unit.children.length] || unit.name, gender, group, rank,
        student: key % 11 === 0, payment: 15_000_000 + group * 1_450_000 + rank * 270_000,
        loans, leaveBalance: key % 23 === 0 ? -(key % 4 + 1) : key % 13 === 0 ? 0 : (key * 5) % 33 + 1,
        requiredLeave: key % 7 === 0, lateMinutes: key % 5 === 0 ? 0 : (key * 17) % 272,
        leaveToday: key % 23 === 0, futureLeave: key % 12 === 0,
      }
    })
  }))
}
export type Person = ReturnType<typeof makeDemoPeople>[number]
let dailyPeople: { day: string; employees: Person[] } | undefined
export function peopleAt(city: 'همه شعب' | Branch) {
  const today = todayInIran()
  const day = taskDayKey(today)
  if (dailyPeople?.day !== day) dailyPeople = { day, employees: makeDemoPeople(today) }
  const { employees } = dailyPeople
  return city === 'همه شعب' ? employees : employees.filter(person => person.city === city)
}

export function unitStats(people: Person[]) {
  return orgUnits.flatMap(unit => {
    const members = people.filter(person => person.unit === unit.name)
    if (!members.length) return []
    return [{
      name: unit.name, members, women: members.filter(person => person.gender === 'زن').length,
      payment: sum(members, person => person.payment), students: members.filter(person => person.student).length,
    }]
  })
}

export const horizons = [1, 3, 6, 12]
export function horizonCounts(people: Person[], months: number, state: 'در نوبت' | 'پرداخت‌شده', type: LoanType) {
  const today = todayInIran()
  const end = monthDate(today, months, 1)
  const start = taskDayKey(today)
  return people.filter(person => person.loans.some(loan => loan.type === type && loan.status === state && loan.date >= start && loan.date < end)).length
}
