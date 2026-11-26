'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Settings2, X } from 'lucide-react'

const dragType = 'application/x-didar-module'
const key = 'didar-overview-layout-v1'
const initial = ['metrics', 'gender', 'charts']
const labels: Record<string, string> = {
  metrics: 'شاخص‌های کلیدی', gender: 'ترکیب کارکنان', charts: 'توزیع واحدها و شعب',
  loans: 'پوشش وام', attendance: 'مرخصی و کارکرد', finance: 'دریافتی واحدها',
}

export default function OverviewLayout({ modules }: { modules: Record<string, ReactNode> }) {
  const [order, setOrder] = useState(initial)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (Array.isArray(saved)) setOrder([...new Set<string>(saved.filter(id => typeof id === 'string' && id in labels))])
    } catch { /* Use the default layout. */ }
  }, [])

  function save(value: string[]) {
    setOrder(value)
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Changes remain active for this visit. */ }
  }
  function move(id: string, before?: string) {
    if (!(id in labels) || id === before) return
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
        {editing && <div className="module-drop">برای افزودن به انتهای صفحه، ماژول را اینجا رها کنید.</div>}
      </div>
    </div>
  </>
}
