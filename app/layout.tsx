import type { Metadata } from 'next'
import '@fontsource-variable/vazirmatn'
import './globals.css'

export const metadata: Metadata = {
  title: 'دیدار | داشبورد منابع انسانی',
  description: 'نمای منابع انسانی الکتروکویر برای تهران و یزد',
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>
}
