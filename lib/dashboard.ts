export const cities = ['همه شعب', 'تهران', 'یزد'] as const
export type City = typeof cities[number]

export const departments = [
  { name: 'تولید و عملیات', tehran: 34, yazd: 100 },
  { name: 'فروش و بازاریابی', tehran: 57, yazd: 27 },
  { name: 'فنی و مهندسی', tehran: 39, yazd: 25 },
  { name: 'مالی و اداری', tehran: 34, yazd: 18 },
  { name: 'منابع انسانی', tehran: 22, yazd: 6 },
  { name: 'پشتیبانی', tehran: 18, yazd: 20 },
]

const demo = {
  تهران: { active: 194, leave: 7, hires: 8, overtime: 620, absence: 3, missions: 12 },
  یزد: { active: 186, leave: 10, hires: 6, overtime: 1160, absence: 2, missions: 8 },
}

// Replace the demo provider with normalized aggregates from server-side API and table adapters.
export function getDashboard(city: City) {
  const branches = city === 'همه شعب' ? [demo.تهران, demo.یزد] : [demo[city]]
  const sum = (key: keyof typeof demo.تهران) => branches.reduce((total, branch) => total + branch[key], 0)
  const units = departments.map(({ name, tehran, yazd }) => ({
    name,
    count: city === 'تهران' ? tehran : city === 'یزد' ? yazd : tehran + yazd,
  }))
  return {
    total: units.reduce((total, unit) => total + unit.count, 0),
    active: sum('active'),
    leave: sum('leave'),
    hires: sum('hires'),
    overtime: sum('overtime'),
    absence: sum('absence'),
    missions: sum('missions'),
    units,
  }
}
