'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import YazdMap from './yazd-map'
import { readBasemap, searchBasemap, updateBasemap, type Address, type Basemap, type Point } from '../lib/yazd-basemap'
import { ExternalLink, MapPin, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react'

type Route = { count: number; points: Point[] }
const key = 'didar-yazd-service-routes-v1'
const colors = ['#ccb1ff', '#86e0f7', '#ffb5d1', '#fbd17f', '#a5e8b6', '#ffa489', '#a9bcff']
const terminal: Point = [31.919, 54.393]
const sample: Route[] = [
  { count: 19, points: [[31.933, 54.328], [31.928, 54.355], [31.927, 54.380], terminal] },
  { count: 23, points: [[31.900, 54.314], [31.903, 54.336], [31.908, 54.349], [31.924, 54.376], terminal] },
  { count: 15, points: [[31.892, 54.356], [31.900, 54.362], [31.908, 54.372], terminal] },
  { count: 21, points: [[31.860, 54.325], [31.875, 54.341], [31.891, 54.341], [31.909, 54.352], terminal] },
  { count: 17, points: [[31.858, 54.367], [31.874, 54.370], [31.890, 54.380], [31.905, 54.387], terminal] },
  { count: 14, points: [[31.870, 54.423], [31.889, 54.412], [31.903, 54.403], terminal] },
  { count: 18, points: [[31.925, 54.430], [31.922, 54.409], terminal] },
]
const fa = (value: number) => value.toLocaleString('fa-IR')

function readRoutes(): Route[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Route[] | null
    if (Array.isArray(saved) && saved.length === 7 && saved.every(route =>
      route && Number.isSafeInteger(route.count) && route.count >= 0 &&
      Array.isArray(route.points) && route.points.length >= 2 &&
      route.points.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)),
    )) return saved
  } catch { /* A missing or invalid local draft falls back to the demo. */ }
  return sample
}

export default function ServiceMap() {
  const [routes, setRoutes] = useState<Route[]>(readRoutes)\n  const [roadRoutes, setRoadRoutes] = useState<Route[]>(readRoutes)
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState<Route | null>(null)
  const [status, setStatus] = useState('')
  const active = draft ?? routes[selected]\n  useEffect(() => {\n    let cancelled = false\n    async function roadRoute(route: Route): Promise<Route> {\n      if (route.points.length < 2) return route\n      const coordinates = route.points.map(([lat,lng]) => lng + ',' + lat).join(';')\n      try {\n        const response = await fetch('https://router.project-osrm.org/route/v1/driving/' + coordinates + '?overview=full&geometries=geojson&steps=false', { signal: AbortSignal.timeout(12000) })\n        if (!response.ok) return route\n        const data = await response.json()\n        const line = data.routes?.[0]?.geometry?.coordinates\n        if (!Array.isArray(line) || line.length < 2) return route\n        return { ...route, points: line.map(([lng,lat]: [number,number]) => [lat,lng] as Point) }\n      } catch { return route }\n    }\n    Promise.all(routes.map(roadRoute)).then(result => { if (!cancelled) setRoadRoutes(result) })\n    return () => { cancelled = true }\n  }, [routes])\n

  const [basemap, setBasemap] = useState<Basemap | null>(null)
  const [updating, setUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')

  useEffect(() => {
    let mounted = true
    readBasemap().then(saved => { if (mounted) setBasemap(saved) }).catch(() => {
      if (mounted) setUpdateMessage('خواندن نقشهٔ ذخیره‌شده در این مرورگر ممکن نیست.')
    })
    return () => { mounted = false }
  }, [])

  async function refreshMap() {
    setUpdating(true)
    setUpdateMessage('در حال دریافت خیابان‌های یزد…')
    try {
      setBasemap(await updateBasemap())
      setUpdateMessage('نقشه برای استفادهٔ آفلاین ذخیره شد.')
    } catch {
      setUpdateMessage('دریافت یا ذخیرهٔ نقشه انجام نشد. اینترنت و دسترسی به سرویس نقشه را بررسی کنید.')
    } finally {
      setUpdating(false)
    }
  }

  const [query, setQuery] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [address, setAddress] = useState<Address | null>(null)
  const [searchMessage, setSearchMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const lastSearch = useRef(0)
  const cache = useRef(new Map<string, Address[]>())

  function addPoint(point: Point) {
    setDraft(current => current && { ...current, points: [...current.points, point] })
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = query.trim()
    if (!term || searching) return
    const results = basemap ? searchBasemap(basemap, term) : []
    setAddresses(results)
    setSearchMessage(results.length ? '' : basemap ? 'در نقشهٔ ذخیره‌شده نتیجه‌ای نبود. می‌توانید آنلاین جست‌وجو کنید.' : 'ابتدا نقشه را دانلود کنید یا آنلاین جست‌وجو کنید.')
  }

  async function searchOnline() {
    const term = query.trim()
    if (!term || searching) return
    const cached = cache.current.get(term)
    if (cached) {
      setAddresses(cached)
      setSearchMessage(cached.length ? '' : 'آدرسی در محدودهٔ یزد پیدا نشد.')
      return
    }
    if (Date.now() - lastSearch.current < 1100) return
    lastSearch.current = Date.now()
    setSearching(true)
    setSearchMessage('در حال جست‌وجو…')
    setAddresses([])
    const params = new URLSearchParams({
      q: term, format: 'jsonv2', limit: '5', countrycodes: 'ir', bounded: '1',
      viewbox: '54.23,32.02,54.54,31.79', 'accept-language': 'fa,en',
    })
    try {
      const response = await fetch('https://nominatim.openstreetmap.org/search?' + params, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('Address search unavailable')
      const data: { lat: string; lon: string; display_name: string }[] = await response.json()
      const results = data
        .map(({ lat, lon, display_name }): Address => ({ point: [Number(lat), Number(lon)], label: display_name }))
        .filter(({ point, label }) => point.every(Number.isFinite) && typeof label === 'string')
      cache.current.set(term, results)
      setAddresses(results)
      setSearchMessage(results.length ? '' : 'آدرسی در محدودهٔ یزد پیدا نشد.')
    } catch {
      setSearchMessage('سرویس جست‌وجوی آدرس در دسترس نیست. دوباره امتحان کنید.')
    } finally {
      setSearching(false)
    }
  }

  function save() {
    if (!draft || draft.points.length < 2 || !Number.isSafeInteger(draft.count)) return
    const updated = routes.map((route, index) => index === selected ? draft : route)
    try {
      localStorage.setItem(key, JSON.stringify(updated))
      setStatus('تغییرات در همین مرورگر ذخیره شد.')
    } catch {
      setStatus('تغییرات برای این جلسه ثبت شد. ذخیرهٔ مرورگر در دسترس نیست.')
    }
    setRoutes(updated)
    setDraft(null)
  }

  return <section className="panel glass service-panel">
    <div className="panel-head"><div><h2>نقشهٔ سرویس‌های یزد</h2><p>۷ خط نمونه · مسیرها و تعداد نفرات قابل ویرایش</p></div><button className="export" onClick={refreshMap} disabled={updating}><RefreshCw size={15}/>به‌روزرسانی نقشه</button></div>
    {(updateMessage || basemap) && <p className="map-search-status" role="status">{updateMessage || ('نسخهٔ ذخیره‌شده · ' + new Date(basemap!.updatedAt).toLocaleDateString('fa-IR'))}</p>}
    <div className="service-layout">
      <div>
        <form className="map-search" onSubmit={search}>
          <input aria-label="آدرس در یزد" placeholder="نام خیابان، محله یا مکان در یزد" value={query} onChange={event => setQuery(event.target.value)} required/>
          <button className="export" disabled={searching} type="submit"><Search size={15}/>جست‌وجو</button>
          <button className="icon-button" type="button" disabled={searching || !query.trim()} onClick={searchOnline}>جست‌وجوی آنلاین</button>
        </form>
        {searchMessage && <p className="map-search-status" role="status">{searchMessage}</p>}
        {addresses.length > 0 && <ul className="address-results">
          {addresses.map((result, index) => <li key={index}>
            <button onClick={() => { setAddress(result); setAddresses([]) }}><MapPin size={15}/>{result.label}</button>
          </li>)}
        </ul>}
        <div className="route-map">
          <YazdMap basemap={basemap} routes={roadRoutes.map((route, index) => ({ color: colors[index], points: index === selected && draft ? active.points : route.points }))} selected={selected} editing={Boolean(draft)} address={address} onAddPoint={addPoint}/>
        </div>
        <a className="map-link" href="https://www.openstreetmap.org/#map=13/31.897/54.367" target="_blank" rel="noreferrer">باز کردن یزد در OpenStreetMap <ExternalLink size={13}/></a>
      </div>
      <div>
        <div className="route-list" aria-label="خطوط سرویس">
          {routes.map((route, index) => <button key={index} disabled={Boolean(draft)} onClick={() => { setSelected(index); setStatus('') }} aria-pressed={selected === index}>
            <i style={{ background: colors[index] }}/><span>سرویس {fa(index + 1)}</span><strong>{fa(index === selected ? active.count : route.count)} نفر</strong>
          </button>)}
        </div>
        {draft ? <div className="route-editor">
          <label>تعداد نفرات <input aria-label="تعداد نفرات" type="number" min="0" step="1" value={draft.count} onChange={event => setDraft({ ...draft, count: Math.max(0, Math.trunc(Number(event.target.value))) })}/></label>
          <p><Plus size={14}/> برای افزودن نقطهٔ مسیر، روی نقشه کلیک کنید.</p>
          {address && <button className="icon-button add-address" onClick={() => addPoint(address.point)}><MapPin size={14}/>افزودن آدرس انتخابی به مسیر</button>}
          <div className="stop-list">
            {draft.points.map(([lat, lng], index) => <div key={index}>
              <span>نقطهٔ {fa(index + 1)}</span><b dir="ltr">{lat.toFixed(4)}, {lng.toFixed(4)}</b>
              <button className="icon-button" aria-label={'حذف نقطهٔ ' + fa(index + 1)} onClick={() => setDraft({ ...draft, points: draft.points.filter((_, stop) => stop !== index) })}><Trash2 size={13}/></button>
            </div>)}
          </div>
          <div className="route-actions">
            <button className="export" disabled={draft.points.length < 2 || !Number.isSafeInteger(draft.count)} onClick={save}><Save size={15}/>ذخیره</button>
            <button className="icon-button" onClick={() => setDraft(null)}><X size={15}/>لغو</button>
          </div>
        </div> : <button className="export route-edit" onClick={() => { setStatus(''); setDraft(active) }}><Pencil size={15}/>ویرایش سرویس {fa(selected + 1)}</button>}
        <p className="route-status" role="status">{status}</p>
      </div>
    </div>
  </section>
}
