export type LoanKind = 'کوتاه‌مدت' | 'امتیازی' | 'ضروری'
export type LoanRecord = { unit: string; kind: LoanKind; count: number; amount: number }

// داده‌های نمایشی اولیه؛ پس از اتصال BPMS با اطلاعات واقعی جایگزین می‌شوند.
export const sampleLoans: LoanRecord[] = [
  { unit: 'تولید و عملیات', kind: 'کوتاه‌مدت', count: 18, amount: 5400000000 },
  { unit: 'تولید و عملیات', kind: 'امتیازی', count: 9, amount: 7200000000 },
  { unit: 'تولید و عملیات', kind: 'ضروری', count: 6, amount: 1800000000 },
  { unit: 'فروش و بازاریابی', kind: 'کوتاه‌مدت', count: 8, amount: 2400000000 },
  { unit: 'فروش و بازاریابی', kind: 'امتیازی', count: 5, amount: 4000000000 },
  { unit: 'فروش و بازاریابی', kind: 'ضروری', count: 3, amount: 900000000 },
  { unit: 'فنی و مهندسی', kind: 'کوتاه‌مدت', count: 11, amount: 3300000000 },
  { unit: 'فنی و مهندسی', kind: 'امتیازی', count: 7, amount: 5600000000 },
  { unit: 'فنی و مهندسی', kind: 'ضروری', count: 4, amount: 1200000000 },
  { unit: 'مالی و اداری', kind: 'کوتاه‌مدت', count: 6, amount: 1800000000 },
  { unit: 'مالی و اداری', kind: 'امتیازی', count: 4, amount: 3200000000 },
  { unit: 'مالی و اداری', kind: 'ضروری', count: 2, amount: 600000000 },
  { unit: 'منابع انسانی', kind: 'کوتاه‌مدت', count: 3, amount: 900000000 },
  { unit: 'منابع انسانی', kind: 'امتیازی', count: 2, amount: 1600000000 },
  { unit: 'منابع انسانی', kind: 'ضروری', count: 2, amount: 600000000 },
  { unit: 'پشتیبانی', kind: 'کوتاه‌مدت', count: 5, amount: 1500000000 },
  { unit: 'پشتیبانی', kind: 'امتیازی', count: 3, amount: 2400000000 },
  { unit: 'پشتیبانی', kind: 'ضروری', count: 2, amount: 600000000 },
]
