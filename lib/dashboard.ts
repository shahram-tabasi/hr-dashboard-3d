import { orgUnits, peopleAt } from './people'

export const cities = ['همه شعب', 'تهران', 'یزد'] as const
export type City = typeof cities[number]

export const departments = orgUnits.map(unit => ({ name: unit.name, tehran: unit.tehran, yazd: unit.yazd }))

const demo = {
  تهران: { active: 194, hires: 8, overtime: 620, absence: 3, missions: 12 },
  یزد: { active: 186, hires: 6, overtime: 1160, absence: 2, missions: 8 },
}

export function getDashboard(city: City) {
  const branches = city === 'همه شعب' ? [demo.تهران, demo.یزد] : [demo[city]]
  const sum = (key: keyof typeof demo.تهران) => branches.reduce((total, branch) => total + branch[key], 0)
  const people = peopleAt(city)
  return {
    total: people.length,
    active: sum('active'),
    leave: people.filter(person => person.leaveToday).length,
    hires: sum('hires'),
    overtime: sum('overtime'),
    absence: sum('absence'),
    missions: sum('missions'),
    units: departments.map(unit => ({ name: unit.name, count: people.filter(person => person.unit === unit.name).length })).filter(unit => unit.count),
  }
}
