'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import Sky from './sky'
import { useEffect, useState, type CSSProperties } from 'react'
import { Activity, ArrowDownToLine, ArrowLeft, BriefcaseBusiness, Building2, BusFront, CalendarDays, ChevronDown, CircleHelp, Clock3, Database, LayoutDashboard, MapPin, Menu, PanelRightClose, PanelRightOpen, UserCheck, UserPlus, Users, X } from 'lucide-react'
import { cities, getDashboard, type City } from '../lib/dashboard'
import sources from '../lib/sources.json'

const Planner = dynamic(() => import('./planner'), { ssr: false })
const ServiceMap = dynamic(() => import('./service-map'), { ssr: false })

const nav = [
  { id: 'overview', title: 'نمای کلی', icon: LayoutDashboard, sections: [
    { id: 'metrics', label: 'شاخص‌های کلیدی' },
    { id: 'branches', label: 'پراکندگی شعب' },
  ] },
  { id: 'workforce', title: 'نیروی انسانی', icon: Users, sections: [
    { id: 'metrics', label: 'آمار کارکنان' },
    { id: 'departments', label: 'واحدهای سازمانی' },
    { id: 'gender', label: 'تفکیک زن و مرد' },
  ] },
  { id: 'attendance', title: 'حضور و کارکرد', icon: Clock3, sections: [
    { id: 'leave', label: 'مرخصی' },
    { id: 'absence', label: 'غیبت' },
    { id: 'overtime', label: 'اضافه‌کار' },
    { id: 'missions', label: 'مأموریت' },
  ] },
  { id: 'transport', title: 'سرویس کارکنان', icon: BusFront, sections: [{ id: 'service-map', label: 'نقشهٔ سرویس‌های یزد' }] },
  { id: 'planner', title: 'تقویم شمسی', icon: CalendarDays, sections: [{ id: 'daily-planner', label: 'برنامهٔ روزانه' }] },
  { id: 'data', title: 'منابع داده', icon: Database, sections: [
    { id: 'catalog', label: 'کاتالوگ داده‌ها' },
    { id: 'catalog-filters', label: 'جست‌وجوی فیلدها' },
  ] },
] as const
type View = typeof nav[number]['title']
const fa = (value: number) => value.toLocaleString('fa-IR')
const sourceGroups = Array.from(new Set(sources.map(({ source }) => source).filter(Boolean)))

export default function Dashboard() {
  const [city, setCity] = useState<City>('همه شعب')
  const [view, setView] = useState<View>('نمای کلی')
  const [menu, setMenu] = useState(false)
  const [expanded, setExpanded] = useState<View | null>('نمای کلی')
  const [destination, setDestination] = useState<{ id: string } | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const toggleLabel = collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'
  const ToggleIcon = collapsed ? PanelRightOpen : PanelRightClose
  const [help, setHelp] = useState(false)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('')
  const data = getDashboard(city)
  const all = getDashboard('همه شعب')
  const tehran = getDashboard('تهران').total
  const yazd = getDashboard('یزد').total
  const demographics = [
    { city: 'تهران', women: 77, total: tehran },
    { city: 'یزد', women: 53, total: yazd },
  ].filter(branch => city === 'همه شعب' || branch.city === city)
  const tehranShare = tehran / all.total * 100
  const cards = [
    { title: 'کل کارکنان', value: data.total, icon: Users, tone: 'rose', note: city === 'همه شعب' ? 'در دو شعبه فعال' : 'شعبه ' + city },
    { title: 'کارکنان فعال', value: data.active, icon: UserCheck, tone: 'silver', note: fa(Math.round(data.active / data.total * 100)) + '٪ از کل کارکنان' },
    { title: 'استخدام جدید', value: data.hires, icon: UserPlus, tone: 'peach', note: 'در ماه جاری' },
    { title: 'در مرخصی', value: data.leave, icon: CalendarDays, tone: 'blue', note: 'وضعیت امروز' },
  ]
  const attendance = [
    { id: 'leave', name: 'مرخصی', value: data.leave, unit: 'نفر', icon: CalendarDays },
    { id: 'absence', name: 'غیبت', value: data.absence, unit: 'نفر', icon: Users },
    { id: 'overtime', name: 'اضافه‌کار', value: data.overtime, unit: 'ساعت', icon: Clock3 },
    { id: 'missions', name: 'مأموریت', value: data.missions, unit: 'مورد', icon: BriefcaseBusiness },
  ]
  const shownSources = sources.filter(row => (!source || row.source === source) && Object.values(row).some(value => value.includes(query.trim())))

  useEffect(() => {
    if (!help) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHelp(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [help])

  useEffect(() => {
    if (!destination) return
    const section = document.getElementById(destination.id)
    section?.focus({ preventScroll: true })
    section?.scrollIntoView({ block: 'nearest' })
  }, [destination])

  function go(next: View, section?: string) {
    setView(next)
    setDestination(section ? { id: section } : null)
    setMenu(false)
  }

  function download() {
    const rows = view === 'منابع داده'
      ? [['فیلد', 'مرجع', 'روش'], ...shownSources.map(row => [row.field, row.source, row.method])]
      : view === 'حضور و کارکرد'
        ? [['شاخص نمونه', 'مقدار', 'واحد', 'شعبه'], ...attendance.map(item => [item.name, item.value, item.unit, city])]
        : [['واحد سازمانی', 'تعداد نمونه', 'شعبه'], ...data.units.map(unit => [unit.name, unit.count, city])]
    const csv = rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = view === 'منابع داده' ? 'data-catalog.csv' : 'hr-demo.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className={collapsed ? 'shell collapsed' : 'shell'}>
      <Sky />
      {menu && <button className="scrim" aria-label="بستن منو" onClick={() => setMenu(false)} />}
      <aside className={'sidebar glass' + (menu ? ' opened' : '')}>
        <svg className="sidebar-outline outline-wide" viewBox="0 0 232 852" preserveAspectRatio="none" aria-hidden="true">
          <path d="M24 1 H210 C224 1 231 8 231 22 V830 C231 844 224 851 210 851 H24 C9 851 1 837 2.5 809 C24 562 24 280 2.5 43 C1 15 9 1 24 1 Z" />
        </svg>
        <svg className="sidebar-outline outline-compact" viewBox="0 0 76 852" preserveAspectRatio="none" aria-hidden="true">
          <path d="M24 1 H54 C68 1 75 8 75 22 V830 C75 844 68 851 54 851 H24 C9 851 1 837 2.5 809 C9 562 9 280 2.5 43 C1 15 9 1 24 1 Z" />
        </svg>
        <div className="brand"><span className="brand-icon"><Image src="/kavir-logo.svg" width={29} height={29} alt="لوگوی کویر" /></span><div className="sidebar-label"><strong>دیدار</strong><small>منابع انسانی الکتروکویر</small></div><button className="icon-button sidebar-toggle" type="button" aria-label={toggleLabel} title={toggleLabel} aria-expanded={!collapsed} aria-controls="dashboard-navigation" onClick={() => setCollapsed(!collapsed)}><ToggleIcon size={18}/></button></div>
        <div className="sidebar-person">
          <span className="avatar-frame">
            <Image src="/hr-avatar.webp" alt="" width={48} height={48} />
          </span>
          <div className="sidebar-label"><strong>پروفایل منابع انسانی</strong><small>ارائهٔ الکتروکویر</small></div>
        </div>
        <div className="nav-label">فضای کاری</div>
        <nav id="dashboard-navigation" aria-label="ناوبری اصلی">
          {nav.map(({ id, title, icon: Icon, sections }) => (
            <div key={id} className="nav-group">
              <div className={view === title ? 'nav-row active' : 'nav-row'}>
                <button className="nav" aria-label={title} title={title} aria-current={view === title ? 'page' : undefined} onClick={() => {
                  go(title)
                  setExpanded(title)
                }}><Icon size={19}/><span className="sidebar-label">{title}</span></button>
                <button className="submenu-toggle" aria-label={'زیرمنوی ' + title} aria-expanded={expanded === title} aria-controls={'submenu-' + id} onClick={() => setExpanded(expanded === title ? null : title)}><ChevronDown size={15}/></button>
              </div>
              <ul className="submenu" id={'submenu-' + id} hidden={expanded !== title}>
                {sections.map(section => <li key={section.id}><button onClick={() => go(title, section.id)}>{section.label}</button></li>)}
              </ul>
            </div>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="nav" aria-label="راهنمای داشبورد" title="راهنمای داشبورد" onClick={() => setHelp(true)}><CircleHelp size={19}/><span className="sidebar-label">راهنمای داشبورد</span></button>
          <div className="profile"><span className="profile-icon"><Building2 size={19}/></span><div className="sidebar-label"><strong>الکتروکویر</strong><small>واحد منابع انسانی</small></div></div>
        </div>
      </aside>
      <nav className="glass compact-dock" aria-label="نوار جمع‌شده" style={{ '--tab-count': nav.length } as CSSProperties}>
        <span className="dock-highlight" style={{ '--active-tab': nav.findIndex(item => item.title === view) } as CSSProperties} aria-hidden="true"/>
        {nav.map(({ title, icon: Icon }) => <button key={title} aria-current={view === title ? 'page' : undefined} onClick={() => go(title)}><Icon size={19}/><span>{title}</span></button>)}
        <button className="dock-expand" aria-label="باز کردن منو" aria-expanded={menu} aria-controls="dashboard-navigation" onClick={() => setMenu(true)}><Menu size={19}/></button>
      </nav>
      <main>
        <header className="topbar">
          <div className="trail"><span>فضای کاری</span><ArrowLeft size={13}/><strong>{view}</strong></div>
          <div className="actions">
            {view !== 'منابع داده' && view !== 'سرویس کارکنان' && view !== 'تقویم شمسی' && <label className="select"><MapPin size={16}/><select aria-label="فیلتر شعبه" value={city} onChange={event => setCity(event.target.value as City)}>{cities.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={14}/></label>}
            {view !== 'سرویس کارکنان' && view !== 'تقویم شمسی' && <button className="export" aria-label="خروجی گزارش" onClick={download}><ArrowDownToLine size={16}/><span>خروجی گزارش</span></button>}
          </div>
        </header>

        {view === 'نمای کلی' && <div className="page-intro overview-intro"><div><h1>داشبورد منابع انسانی</h1><p>الکتروکویر · تهران و یزد</p></div><span className="demo"><i/>داده‌های نمایشی</span></div>}
        {view !== 'نمای کلی' && <div className="page-intro"><h1>{view}</h1><p>{view === 'منابع داده' ? 'فهرست فیلدها و مراجع استخراج‌شده از فایل اکسل' : view === 'سرویس کارکنان' ? 'مدیریت مسیر و ظرفیت سرویس‌های یزد' : view === 'تقویم شمسی' ? 'کارهای روزانه و تعطیلات رسمی' : 'داده‌های نمایشی · ' + city}</p></div>}

        {(view === 'نمای کلی' || view === 'نیروی انسانی') && <>
          <div className="section-title" id="metrics" tabIndex={-1}><h2>شاخص‌های کلیدی</h2><span><Activity size={15}/> {city}</span></div>
          <section className="cards" aria-label="شاخص‌های کلیدی">
            {cards.map(({ title, value, icon: Icon, tone, note }) => <article className="metric glass" key={title}><div className="metric-top"><span className={'metric-icon ' + tone}><Icon size={21}/></span><span>{title}</span></div><strong>{fa(value)}</strong><small>{note}</small></article>)}
          </section>

          <section className="panel glass demographic" id="gender" tabIndex={-1}>
            <div className="panel-head"><div><h2>کارکنان به تفکیک شعبه و جنسیت</h2><p>تعداد نمونهٔ زنان و مردان در هر شعبه</p></div><span className="panel-icon"><Users size={19}/></span></div>
            <div className="gender-grid">
              {demographics.map(branch => <article className="gender-branch" key={branch.city}>
                <h3><MapPin size={15}/>{branch.city}</h3>
                <div><span>زن <strong>{fa(branch.women)}</strong></span><span>مرد <strong>{fa(branch.total - branch.women)}</strong></span></div>
              </article>)}
            </div>
          </section>
          <div className="charts">
            <section className="panel glass" id="departments" tabIndex={-1}>
              <div className="panel-head"><div><h2>توزیع نیرو در واحدها</h2><p>تعداد کارکنان به تفکیک واحد سازمانی</p></div><span className="panel-icon"><Building2 size={19}/></span></div>
              <div className="bars">{data.units.map(unit => <div className="bar-row" key={unit.name}><span>{unit.name}</span><div className="bar-track"><div style={{ width: (unit.count / Math.max(...data.units.map(item => item.count)) * 100) + '%' }}/></div><strong>{fa(unit.count)}</strong></div>)}</div>
            </section>
            <section className="panel glass branch-panel" id="branches" tabIndex={-1}>
              <div className="panel-head"><div><h2>پراکندگی شعب</h2><p>سهم هر شعبه از کل نیروی انسانی</p></div><span className="panel-icon"><MapPin size={19}/></span></div>
              <div style={{ '--tehran-share': tehranShare + '%' } as CSSProperties} className={'donut ' + (city === 'تهران' ? 'only-tehran' : city === 'یزد' ? 'only-yazd' : '')}><div><strong>{fa(data.total)}</strong><small>نفر</small></div></div>
              <div className="legend">
                <button aria-pressed={city === 'تهران'} onClick={() => setCity(city === 'تهران' ? 'همه شعب' : 'تهران')}><i className="tehran"/><span>تهران</span><strong>{fa(tehran)}</strong><small>{fa(Math.round(tehran / all.total * 100))}٪</small></button>
                <button aria-pressed={city === 'یزد'} onClick={() => setCity(city === 'یزد' ? 'همه شعب' : 'یزد')}><i className="yazd"/><span>یزد</span><strong>{fa(yazd)}</strong><small>{fa(Math.round(yazd / all.total * 100))}٪</small></button>
              </div>
            </section>
          </div>
        </>}

        {view === 'تقویم شمسی' && <div id="daily-planner" tabIndex={-1}><Planner/></div>}
        {view === 'سرویس کارکنان' && <div id="service-map" tabIndex={-1}><ServiceMap/></div>}
        {view === 'حضور و کارکرد' && <section className="cards">{attendance.map(({ id, name, value, unit, icon: Icon }) => <article className="metric glass" id={id} tabIndex={-1} key={id}><div className="metric-top"><span className="metric-icon rose"><Icon size={21}/></span>{name}</div><strong>{fa(value)}</strong><small>{unit} · منبع تعریف‌شده در اکسل: کسری</small></article>)}</section>}
        {view === 'منابع داده' && <section className="panel glass catalog" id="catalog" tabIndex={-1}><div className="panel-head"><div><h2>کاتالوگ داده‌ها</h2><p>{fa(shownSources.length)} فیلد · اتصال‌ها در انتظار تکمیل</p></div><span className="panel-icon"><Database size={19}/></span></div><div className="catalog-filters"><input id="catalog-filters" aria-label="جست‌وجوی فیلدها" placeholder="جست‌وجو در فیلدها…" value={query} onChange={event => setQuery(event.target.value)}/><select aria-label="مرجع داده" value={source} onChange={event => setSource(event.target.value)}><option value="">همه مراجع</option>{sourceGroups.map(group => <option key={group}>{group}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>فیلد</th><th>مرجع</th><th>روش دریافت / تیم</th></tr></thead><tbody>{shownSources.map(row => <tr key={row.field}><td>{row.field}</td><td>{row.source || '—'}</td><td>{row.method || '—'}</td></tr>)}</tbody></table>{shownSources.length === 0 && <p className="empty">فیلدی با این جست‌وجو پیدا نشد.</p>}</div></section>}
        <footer><span>دیدار · منابع انسانی الکتروکویر</span><button onClick={() => go('منابع داده')}>مراجع داده <ArrowLeft size={13}/></button></footer>
      </main>
      {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={event => event.stopPropagation()}><div className="panel-head"><h2 id="help-title">راهنمای داشبورد</h2><button autoFocus className="icon-button" aria-label="بستن" onClick={() => setHelp(false)}><X size={20}/></button></div><p>از منوی بالای صفحه یا نمودار شعب، تهران و یزد را فیلتر کنید. خروجی CSV براساس نمای فعلی تهیه می‌شود.</p><p>شاخص‌ها با داده‌های نمایشی نمایش داده می‌شوند. فهرست منابع و روش دریافت آن‌ها در بخش «منابع داده» آمده است.</p></section></div>}
    </div>
  )
}
