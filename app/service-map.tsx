'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import YazdMap, { mapStyles, type MapStyle } from './yazd-map'
import AnalyticsChart from './analytics-charts'
import { readRoutes, routeStorageKey, routeColors as colors, type Route } from '../lib/service-routes'
import { importYazdMap, readBasemap, searchBasemap, updateBasemap, type Address, type Basemap, type Point } from '../lib/yazd-basemap'
import { ExternalLink, MapPin, Pencil, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from 'lucide-react'

const fa = (value: number) => value.toLocaleString('fa-IR')

export default function ServiceMap() {
  const [routes, setRoutes] = useState<Route[]>(readRoutes)
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState<Route | null>(null)
  const [status, setStatus] = useState('')
  const active = draft ?? routes[selected]

  const [mapStyle, setMapStyle] = useState<MapStyle | 'auto'>('auto')
  const [online, setOnline] = useState(false)
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync) }
  }, [])
  const [basemap, setBasemap] = useState<Basemap | null>(null)
  const currentStyle = mapStyle === 'auto' ? online ? 'streets' : 'offline' : mapStyle
  const [updating, setUpdating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    let mounted = true
    readBasemap().then(saved => { if (mounted) setBasemap(saved) }).catch(() => {
      if (mounted) setUpdateMessage('فایل محلی نقشه بارگیری نشد. می‌توانید فایل GeoJSON یزد را وارد کنید.')
    })
    return () => { mounted = false }
  }, [])

  async function refreshMap() {
    setUpdating(true)
    setUpdateError('')
    setUpdateMessage('در حال دریافت خیابان‌های یزد…')
    try {
      const result = await updateBasemap()
      setBasemap(result.basemap)
      setUpdateMessage(result.saved ? 'نقشه برای استفادهٔ آفلاین ذخیره شد.' : 'نقشه دریافت شد. مرورگر اجازهٔ ذخیرهٔ آفلاین نداد.')
    } catch (error) {
      setUpdateMessage('دریافت فایل خیابان‌ها از Overpass انجام نشد. لایهٔ فعلی و مسیرها در دسترس‌اند.')
      if (error instanceof Error) setUpdateError(error.message)
    } finally {
      setUpdating(false)
    }
  }

  async function importMap(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    setUpdateError('')
    try {
      const result = await importYazdMap(file)
      setBasemap(result.basemap)
      setUpdateMessage(result.saved ? 'خطوط خیابان‌های یزد برای استفادهٔ آفلاین ذخیره شد.' : 'فایل باز شد. مرورگر اجازهٔ ذخیرهٔ آفلاین نداد.')
    } catch {
      setUpdateMessage('فایل GeoJSON باید شامل خطوط خیابان در محدودهٔ یزد و حداکثر ۳۲ مگابایت باشد.')
    } finally { setImporting(false) }
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

  function movePoint(index: number, point: Point) {
    setDraft(current => current && { ...current, points: current.points.map((item, i) => i === index ? point : item) })
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
    if (!draft || draft.points.length < 2 || !Number.isSafeInteger(draft.count) || !Number.isSafeInteger(draft.standing ?? 0) || !Number.isSafeInteger(draft.snap ?? 0) || (draft.standing ?? 0) > draft.count) return
    const updated = routes.map((route, index) => index === selected ? draft : route)
    try {
      localStorage.setItem(routeStorageKey, JSON.stringify(updated))
      setStatus('تغییرات در همین مرورگر ذخیره شد.')
    } catch {
      setStatus('تغییرات برای این جلسه ثبت شد. ذخیرهٔ مرورگر در دسترس نیست.')
    }
    setRoutes(updated)
    setDraft(null)
  }

  return <div className="hr-analytics"><section className="panel glass service-panel" id="service-map" tabIndex={-1}>
    <div className="panel-head"><div><h2>نقشهٔ سرویس‌های یزد</h2><p>۷ خط نمونه · مسیرها و تعداد نفرات قابل ویرایش</p></div>
      <div className="map-import-actions">
        <label className="select">لایهٔ نقشه<select aria-label="لایهٔ نقشه یزد" value={mapStyle} onChange={event => setMapStyle(event.target.value as MapStyle | 'auto')}>
          <option value="auto">خودکار · خیابانی هنگام اتصال</option>
          {Object.entries(mapStyles).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
        </select></label>
        <button className="icon-button" onClick={refreshMap} disabled={updating || importing}><RefreshCw size={15}/>{updating ? 'در حال دریافت…' : 'به‌روزرسانی آنلاین'}</button>
        <label className="export map-import"><Upload size={15}/>{importing ? 'در حال واردکردن…' : 'ورود فایل GeoJSON'}
          <input type="file" aria-label="ورود فایل نقشهٔ یزد" accept=".geojson,.json" disabled={updating || importing} onChange={importMap}/>
        </label>
      </div>
    </div>
    {basemap && <p className="map-search-status">{basemap.roads.length ? 'نقشهٔ خطی آفلاین · ' + fa(basemap.roads.length) + ' قطعهٔ خیابان' : 'دادهٔ محلی: مرکز قطعات خیابان و جست‌وجوی نام‌ها'}</p>}
    {updateMessage && <p className="map-search-status" role="status">{updateMessage}</p>}
    {updateError && <code className="map-search-status map-diagnostics" dir="ltr">{updateError}</code>}
    <div className="service-layout">
      <div>
        <form className="map-search" onSubmit={search}>
          <input aria-label="آدرس در یزد" placeholder="نام خیابان، محله یا مکان در یزد" value={query} onChange={event => setQuery(event.target.value)} required/>
          <button className="export" disabled={searching} type="submit"><Search size={15}/>جست‌وجو</button>
          <button className="icon-button" type="button" disabled={searching} onClick={searchOnline}>جست‌وجوی آنلاین</button>
        </form>
        {searchMessage && <p className="map-search-status" role="status">{searchMessage}</p>}
        {addresses.length > 0 && <ul className="address-results">
          {addresses.map((result, index) => <li key={index}>
            <button onClick={() => { setAddress(result); setAddresses([]) }}><MapPin size={15}/>{result.label}</button>
          </li>)}
        </ul>}
        <div className="route-map">
          <YazdMap mapStyle={currentStyle} basemap={basemap} routes={routes.map((route, index) => ({ color: colors[index], points: index === selected ? active.points : route.points }))} selected={selected} editing={Boolean(draft)} address={address} onAddPoint={addPoint} onMovePoint={movePoint}/>
        </div>
        <a className="map-link" href="https://www.openstreetmap.org/#map=13/31.897/54.367" target="_blank" rel="noreferrer">باز کردن یزد در OpenStreetMap <ExternalLink size={13}/></a>
      </div>
      <div>
        <div className="route-list" aria-label="خطوط سرویس">
          {routes.map((route, index) => <button key={index} onClick={() => {
            if (draft && index !== selected) {
              setStatus('ابتدا تغییرات خط فعلی را ذخیره یا لغو کنید.')
              return
            }
            setSelected(index)
            setStatus('')
          }} aria-pressed={selected === index}>
            <i style={{ background: colors[index] }}/><span>سرویس {fa(index + 1)}</span><strong>{fa(index === selected ? active.count : route.count)} نفر</strong>
          </button>)}
        </div>
        <div className="route-kpis">
          <span>ایستگاه‌ها <strong>{fa(active.points.length)}</strong></span>
          <span>مسافران <strong>{fa(active.count)}</strong></span>
          <span>ایستاده <strong>{fa(active.standing ?? 0)}</strong></span>
          <span>اسنپ <strong>{fa(active.snap ?? 0)}</strong></span>
        </div>
        {draft ? <div className="route-editor">
          <label>تعداد نفرات <input aria-label="تعداد نفرات" type="number" min="0" step="1" value={draft.count} onChange={event => setDraft({ ...draft, count: Math.max(0, Math.trunc(Number(event.target.value))) })}/></label>
          <label>مسافر ایستاده <input type="number" min="0" step="1" value={draft.standing ?? 0} onChange={event => setDraft({ ...draft, standing: Math.max(0, Math.trunc(Number(event.target.value))) })}/></label>
          <label>استفاده‌کنندگان اسنپ <input type="number" min="0" step="1" value={draft.snap ?? 0} onChange={event => setDraft({ ...draft, snap: Math.max(0, Math.trunc(Number(event.target.value))) })}/></label>
          {Boolean(draft.standing && draft.standing > draft.count) && <p>تعداد ایستاده باید از تعداد مسافران بیشتر نباشد.</p>}
          <p><Plus size={14}/> روی نقشه ایستگاه اضافه کنید یا نقطهٔ شماره‌دار را بکشید.</p>
          {address && <button className="icon-button add-address" onClick={() => addPoint(address.point)}><MapPin size={14}/>افزودن آدرس انتخابی به مسیر</button>}
          <div className="stop-list">
            {draft.points.map(([lat, lng], index) => <div key={index}>
              <span>نقطهٔ {fa(index + 1)}</span><b dir="ltr">{lat.toFixed(4)}, {lng.toFixed(4)}</b>
              <button className="icon-button" aria-label={'حذف نقطهٔ ' + fa(index + 1)} onClick={() => setDraft({ ...draft, points: draft.points.filter((_, stop) => stop !== index) })}><Trash2 size={13}/></button>
            </div>)}
          </div>
          <div className="route-actions">
            <button className="export" disabled={draft.points.length < 2 || !Number.isSafeInteger(draft.count) || !Number.isSafeInteger(draft.standing ?? 0) || !Number.isSafeInteger(draft.snap ?? 0) || (draft.standing ?? 0) > draft.count} onClick={save}><Save size={15}/>ذخیره</button>
            <button className="icon-button" onClick={() => setDraft(null)}><X size={15}/>لغو</button>
          </div>
        </div> : <button className="export route-edit" onClick={() => { setStatus(''); setDraft(active) }}><Pencil size={15}/>ویرایش سرویس {fa(selected + 1)}</button>}
        <p className="route-status" role="status">{status}</p>
      </div>
    </div>
  </section><AnalyticsChart id="transport-chart" routes={routes}/></div>
}
