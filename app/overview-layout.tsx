'use client'

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { chartLabels } from './analytics-charts'

export const dragType = 'application/x-didar-module'
const previousKey = 'didar-overview-layout-v1'
const key = 'didar-overview-layout-v2'
const initial = ['metrics', 'gender', 'charts', 'service-map']
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

export default function OverviewLayout({ modules, editing, addRequest, resetRequest }: {
  modules: Record<string, ReactNode>; editing: boolean; resetRequest: number; addRequest: { id: string; before?: string } | null
}) {
  const [order, setOrder] = useState(initial)
  const [ready, setReady] = useState(false)
  const handledReset = useRef(resetRequest)
  const gesture = useRef<{ id: string; y: number; active: boolean } | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    try {
      const current = localStorage.getItem(key)
      const saved = JSON.parse(current ?? localStorage.getItem(previousKey) ?? 'null')
      if (Array.isArray(saved)) {
        const known = saved.filter(id => typeof id === 'string' && Object.hasOwn(labels, id))
        if (!current) known.push('service-map')
        setOrder([...new Set<string>(known)])
      }
    } catch { /* Use the default layout. */ }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(key, JSON.stringify(order)) } catch { /* Changes remain active for this visit. */ }
  }, [ready, order])
  useEffect(() => {
    if (!addRequest || !Object.hasOwn(labels, addRequest.id)) return
    setOrder(previous => previous.includes(addRequest.id) ? previous : insert(previous, addRequest.id, addRequest.before))
    setMessage(labels[addRequest.id] + ' در نمای کلی در دسترس است.')
  }, [addRequest])

  useEffect(() => {
    if (handledReset.current === resetRequest) return
    handledReset.current = resetRequest
    setOrder(initial)
    setMessage('چیدمان پیش‌فرض بازگردانده شد.')
  }, [resetRequest])

  function move(id: string, before?: string) {
    if (!Object.hasOwn(labels, id) || id === before) return
    setOrder(previous => insert(previous, id, before))
    setMessage('جای کارت «' + labels[id] + '» تنظیم شد.')
  }

  function shift(index: number, direction: number) {
    const target = index + direction
    if (target < 0 || target >= order.length) return
    const result = [...order]
    ;[result[index], result[target]] = [result[target], result[index]]
    setOrder(result)
    setMessage(labels[order[index]] + ' · جایگاه ' + (target + 1).toLocaleString('fa-IR'))
  }

  function startPointer(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0 || !event.isPrimary) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { id, y: event.clientY, active: false }
  }

  function overModule(event: PointerEvent) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-overview-module]')?.dataset.overviewModule
  }

  function updatePointer(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (!current) return
    if (!current.active && Math.abs(current.y - event.clientY) < 6) return
    current.active = true
    setDragging(current.id)
    setTarget(overModule(event) ?? null)
    if (event.clientY < 75) window.scrollBy(0, -18)
    if (event.clientY > window.innerHeight - 100) window.scrollBy(0, 18)
  }

  function finishPointer(event?: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current
    if (event && current?.active) {
      const hovered = overModule(event)
      const index = hovered ? order.indexOf(hovered) : -1
      if (index >= 0 && hovered !== current.id) {
        const next = order.filter(id => id !== current.id)
        next.splice(index, 0, current.id)
        setOrder(next)
        setMessage(labels[current.id] + ' جابه‌جا شد.')
      }
    }
    gesture.current = null
    setTarget(null)
    setDragging(null)
  }

  function confirmRemoval(id: string) {
    setRemoving(id)
    dialog.current?.showModal()
  }

  return <div className={editing ? 'overview-modules editing-layout' : 'overview-modules'}>
    <p className="layout-status" role="status">{message}</p>
    <div className="module-list" data-overview-drop onDragOver={event => {
      if (editing && event.dataTransfer.types.includes(dragType)) event.preventDefault()
    }} onDrop={event => {
      if (!editing || !event.dataTransfer.types.includes(dragType)) return
      event.preventDefault()
      move(event.dataTransfer.getData(dragType))
    }}>
      {editing && <div className="module-drop">از زیرشاخه‌های منوی اصلی کارت بکشید یا روی علامت افزودن بزنید.</div>}
      {order.map((id, index) => <article key={id} data-overview-module={id} className={target === id && dragging !== id ? 'module-target' : dragging === id ? 'module-moving' : ''} onDrop={event => {
        if (!editing || !event.dataTransfer.types.includes(dragType)) return
        event.preventDefault()
        event.stopPropagation()
        move(event.dataTransfer.getData(dragType), id)
      }}>
        {editing && <div className="module-tools glass">
          <button className="icon-button module-grip" aria-label={'جابجایی ' + labels[id]} title="بکشید یا از کلیدهای بالا و پایین استفاده کنید"
            onPointerDown={event => startPointer(event, id)} onPointerMove={updatePointer}
            onPointerUp={finishPointer} onPointerCancel={() => finishPointer()} onLostPointerCapture={() => finishPointer()}
            onKeyDown={event => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
              event.preventDefault()
              shift(index, event.key === 'ArrowUp' ? -1 : 1)
            }}><GripVertical size={18}/></button>
          <span>{labels[id]}</span>
          <button className="icon-button module-remove" aria-label={'حذف ' + labels[id]} title="حذف از نمای کلی" onClick={() => confirmRemoval(id)}><Trash2 size={16}/></button>
        </div>}
        {modules[id]}
      </article>)}
      {!editing && order.length === 0 && <p className="module-drop">برای افزودن کارت، «ویرایش صفحه» را بزنید.</p>}
    </div>
    <dialog ref={dialog} className="modal glass module-confirm" aria-labelledby="module-dialog-title" onClose={() => setRemoving(null)}>
      <h2 id="module-dialog-title">کارت از نمای کلی حذف شود؟</h2>
      <p>می‌توانید «{removing ? labels[removing] : ''}» را دوباره از منوی اصلی اضافه کنید.</p>
      <form method="dialog" className="module-confirm-actions">
        <button autoFocus className="icon-button" value="cancel">انصراف</button>
        <button className="module-confirm-delete" value="delete" onClick={() => {
          if (!removing) return
          setOrder(previous => previous.filter(id => id !== removing))
          setMessage(labels[removing] + ' از نمای کلی حذف شد.')
          requestAnimationFrame(() => document.getElementById('edit-overview')?.focus())
        }}><Trash2 size={15}/>حذف کارت</button>
      </form>
    </dialog>
  </div>
}

function insert(order: string[], id: string, before?: string) {
  const result = order.filter(item => item !== id)
  const index = before ? result.indexOf(before) : -1
  result.splice(index < 0 ? result.length : index, 0, id)
  return result
}
