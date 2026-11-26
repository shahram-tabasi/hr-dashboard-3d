'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, X } from 'lucide-react'
import { chartLabels } from './analytics-charts'

export const dragType = 'application/x-didar-module'
const key = 'didar-overview-layout-v1'
const initial = ['metrics', 'gender', 'charts']
const labels: Record<string, string> = {
  ...chartLabels,
  metrics: 'شاخص‌های کلیدی', gender: 'ترکیب کارکنان', charts: 'توزیع واحدها و شعب',
  loans: 'پوشش وام', attendance: 'مرخصی و کارکرد', finance: 'دریافتی واحدها',
  'org-chart': 'چارت سازمانی', 'workforce-summary': 'جدول کارکنان واحدها',
  'service-map': 'نقشهٔ سرویس‌های یزد', 'daily-planner': 'برنامهٔ روزانه',
  catalog: 'کاتالوگ داده‌ها', 'catalog-filters': 'جست‌وجوی فیلدها',
}

const aliases: Record<string, string> = {
  branches: 'charts', 'loans-summary': 'loans', 'finance-summary': 'finance', 'attendance-summary': 'attendance',
}
export function moduleForSection(section: string) {
  const id = aliases[section] ?? section
  return Object.hasOwn(labels, id) ? id : undefined
}

export default function OverviewLayout({ modules, editing, setEditing, addRequest }: {
  modules: Record<string, ReactNode>; editing: boolean; setEditing: (value: boolean) => void; addRequest: { id: string } | null
}) {
  const [order, setOrder] = useState(initial)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (Array.isArray(saved)) setOrder([...new Set<string>(saved.filter(id => typeof id === 'string' && Object.hasOwn(labels, id)))])
    } catch { /* Use the default layout. */ }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(key, JSON.stringify(order)) } catch { /* Changes remain active for this visit. */ }
  }, [ready, order])
  useEffect(() => {
    if (!addRequest || !Object.hasOwn(labels, addRequest.id)) return
    setOrder(previous => previous.includes(addRequest.id) ? previous : [...previous, addRequest.id])
  }, [addRequest])

  function save(value: string[]) { setOrder(value) }
  function move(id: string, before?: string) {
    if (!(Object.hasOwn(labels, id)) || id === before) return
    const next = order.filter(item => item !== id)
    const index = before === undefined ? next.length : next.indexOf(before)
    next.splice(index < 0 ? next.length : index, 0, id)
    save(next)
  }
  function shift(index: number, direction: number) {
    const result = [...order]
    const target = index + direction
    ;[result[index], result[target]] = [result[target], result[index]]
    save(result)
  }

  return <>
    <div className="layout-controls"><button className="icon-button" aria-expanded={editing} onClick={() => setEditing(!editing)}><Settings2 size={16}/>{editing ? 'پایان ویرایش' : 'ویرایش چیدمان'}</button></div>
    <div className={editing ? 'overview-modules editing-layout' : 'overview-modules'}>
      {editing && <aside className="panel glass module-palette">
        <h2>ماژول‌ها</h2><p>ماژول را بکشید یا روی آن بزنید.</p>
        {Object.keys(labels).filter(id => !order.includes(id)).map(id => <button key={id} className="icon-button" draggable onDragStart={event => { event.dataTransfer.setData(dragType, id) }} onClick={() => move(id)}><Plus size={15}/>{labels[id]}</button>)}
        <button className="icon-button" onClick={() => save(initial)}>بازگردانی چیدمان</button>
      </aside>}
      <div className="module-list" onDragOver={event => { if (editing && event.dataTransfer.types.includes(dragType)) event.preventDefault() }} onDrop={event => { if (editing && event.dataTransfer.types.includes(dragType)) { event.preventDefault(); move(event.dataTransfer.getData(dragType)) } }}>
        {editing && <div className="module-drop">ماژول را اینجا یا روی یکی از کارت‌ها رها کنید.</div>}
        {order.map((id, index) => <article key={id} onDragOver={event => { if (editing && event.dataTransfer.types.includes(dragType)) event.preventDefault() }} onDrop={event => {
          if (!editing || !event.dataTransfer.types.includes(dragType)) return
          event.preventDefault()
          event.stopPropagation()
          move(event.dataTransfer.getData(dragType), id)
        }}>
          {editing && <div className="module-tools">
            <span draggable onDragStart={event => { event.dataTransfer.setData(dragType, id) }}><GripVertical size={15}/>{labels[id]}</span>
            {index > 0 && <button className="icon-button" aria-label={'بالا بردن ' + labels[id]} onClick={() => shift(index,-1)}><ArrowUp size={13}/></button>}
            {index < order.length - 1 && <button className="icon-button" aria-label={'پایین بردن ' + labels[id]} onClick={() => shift(index,1)}><ArrowDown size={13}/></button>}
            <button className="icon-button" aria-label={'حذف ' + labels[id]} onClick={() => save(order.filter(item => item !== id))}><X size={14}/></button>
          </div>}
          {modules[id]}
        </article>)}
      </div>
    </div>
  </>
}
