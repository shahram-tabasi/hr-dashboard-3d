import type { City } from './dashboard'
import { loanTypes, peopleAt } from './people'

export const loanKinds = loanTypes

export function getLoans(branch: City, filter = 'همه انواع') {
  const rows = new Map<string, { unit: string; city: string; kind: string; count: number; amount: number }>()
  for (const person of peopleAt(branch)) {
    for (const loan of person.loans) {
      if (loan.status !== 'پرداخت‌شده' || (filter !== 'همه انواع' && filter !== loan.type)) continue
      const key = [person.unit, person.city, loan.type].join('|')
      const row = rows.get(key)
      if (row) { row.count++; row.amount += loan.amount }
      else rows.set(key, { unit: person.unit, city: person.city, kind: loan.type, count: 1, amount: loan.amount })
    }
  }
  return [...rows.values()]
}
