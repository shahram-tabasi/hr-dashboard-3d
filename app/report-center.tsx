'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Presentation } from 'lucide-react'
import { exportReport, type ReportFormat, type ReportSection } from '../lib/reports'

const formats = [
  { id: 'pptx', name: 'پاورپوینت', icon: Presentation },
  { id: 'xlsx', name: 'اکسل', icon: FileSpreadsheet },
  { id: 'docx', name: 'ورد', icon: FileText },
] as const

export default function ReportCenter({ sections }: { sections: () => ReportSection[] }) {
  const [selected, setSelected] = useState<string[]>(['overview', 'workforce', 'loans'])
  const [running, setRunning] = useState<ReportFormat | null>(null)
  const [status, setStatus] = useState('')
  const reports = sections()

  async function download(format: ReportFormat) {
    if (running) return
    const included = reports.filter(report => selected.includes(report.id))
    if (!included.length) {
      setStatus('حداقل یک بخش را انتخاب کنید.')
      return
    }
    setRunning(format)
    setStatus('در حال ساخت فایل…')
    try {
      await exportReport(format, included)
      setStatus('فایل گزارش آماده شد.')
    } catch {
      setStatus('ساخت فایل انجام نشد. دوباره تلاش کنید.')
    } finally {
      setRunning(null)
    }
  }

  return <section id="reports" className="panel glass report-center" tabIndex={-1}>
    <div className="panel-head"><div><h2>بخش‌های گزارش</h2><p>بخش‌های موردنیاز را تیک بزنید و فرمت خروجی را انتخاب کنید.</p></div></div>
    <div className="report-options">{reports.map(report => <label key={report.id}>
      <input type="checkbox" checked={selected.includes(report.id)} onChange={event => setSelected(event.target.checked ? [...selected, report.id] : selected.filter(id => id !== report.id))}/>
      {report.title}
    </label>)}</div>
    <div className="report-actions">{formats.map(({ id, name, icon: Icon }) =>
      <button key={id} className="export" aria-busy={running === id} onClick={() => download(id)}><Icon size={17}/>{name}</button>,
    )}</div>
    <p className="planner-note" role="status">{status}</p>
  </section>
}
