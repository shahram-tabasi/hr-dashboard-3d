'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import Sky from './sky'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Activity, ArrowDownToLine, ArrowLeft, Bell, BriefcaseBusiness, Building2, BusFront, CalendarDays, ChevronDown, CircleHelp, Clock3, Database, FileSpreadsheet, FileUp, LayoutDashboard, MapPin, Menu, PanelRightClose, PanelRightOpen, Presentation, UserCheck, UserPlus, Users, X, Wallet, Camera } from 'lucide-react'
import { cities, getDashboard, type City } from '../lib/dashboard'
import sources from '../lib/sources.json'
import { sampleLoans } from '../lib/loans'
import { exportExcel, exportPowerPoint, type ExportSheet } from '../lib/presentation-export'

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
  { id: 'loans', title: 'وام‌ها', icon: Wallet, sections: [{ id: 'loan-summary', label: 'گزارش تسهیلات' }] },
  { id: 'reports', title: 'گزارش و ارائه', icon: Presentation, sections: [{ id: 'report-builder', label: 'انتخاب گزارش‌ها' }] },
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
  const [profileImage, setProfileImage] = useState('/hr-avatar.webp')
  const [notifications, setNotifications] = useState(false)
  const [reportChecks, setReportChecks] = useState<string[]>(['overview','workforce','attendance','loans'])
  const [loanKind, setLoanKind] = useState('همه وام‌ها')
  const [loanUnit, setLoanUnit] = useState('همه واحدها')
  const [importedRows, setImportedRows] = useState<string[][]>([])
  const [importMessage, setImportMessage] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const [profileName] = useState('الهام اسلام نژد')
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

  const reportOptions = [
    { id: 'overview', label: 'نمای کلی و شاخص‌ها' }, { id: 'workforce', label: 'نیروی انسانی و واحدها' },
    { id: 'attendance', label: 'حضور و کارکرد' }, { id: 'loans', label: 'تسهیلات و وام‌ها' },
    { id: 'sources', label: 'منابع داده' }, { id: 'calendar', label: 'برنامه‌ها و تقویم' },
  ]
  const loanRows = sampleLoans.filter(row => (loanKind === 'همه وام‌ها' || row.kind === loanKind) && (loanUnit === 'همه واحدها' || row.unit === loanUnit))
  const loanTotal = loanRows.reduce((sum,row) => sum + row.amount,0)
  const loanCount = loanRows.reduce((sum,row) => sum + row.count,0)
  const unitNames = Array.from(new Set(sampleLoans.map(row => row.unit)))
  const reportSheets = useMemo<ExportSheet[]>(() => {
    const sheets: ExportSheet[] = []
    if (reportChecks.includes('overview')) sheets.push({name:'نمای کلی',rows:[['شاخص','مقدار','شعبه'],['کل کارکنان',data.total,city],['کارکنان فعال',data.active,city],['استخدام جدید',data.hires,city],['در مرخصی',data.leave,city]]})
    if (reportChecks.includes('workforce')) sheets.push({name:'نیروی انسانی',rows:[['واحد سازمانی','تعداد نمونه','شعبه'],...data.units.map(u=>[u.name,u.count,city])]})
    if (reportChecks.includes('attendance')) sheets.push({name:'حضور و کارکرد',rows:[['شاخص','مقدار','واحد','شعبه'],...attendance.map(a=>[a.name,a.value,a.unit,city])]})
    if (reportChecks.includes('loans')) sheets.push({name:'وام‌ها',rows:[['واحد','نوع وام','تعداد','مبلغ ریال'],...loanRows.map(a=>[a.unit,a.kind,a.count,a.amount])]})
    if (reportChecks.includes('sources')) sheets.push({name:'منابع داده',rows:[['فیلد','مرجع','روش'],...shownSources.map(a=>[a.field,a.source,a.method])]})
    if (reportChecks.includes('calendar')) sheets.push({name:'تقویم',rows:[['راهنما','اطلاعات'],['کارها','از تب تقویم شمسی خروجی ICS بگیرید']]})
    return sheets
  }, [reportChecks, data, city, attendance, loanRows, shownSources])
  function download() { exportExcel(reportSheets.length ? reportSheets : [{name:'گزارش',rows:[['پیام'],['ابتدا حداقل یک گزارش انتخاب کنید']]}]) }
  function makeSlides() { exportPowerPoint(reportSheets.map(sheet=>({title:sheet.name,lines:sheet.rows.slice(1,11).map(row=>row.map(String).join('  |  '))}))) }
  async function uploadProfile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5*1024*1024) { setImportMessage('تصویر باید حداکثر ۵ مگابایت باشد.'); return }
    const body = new FormData(); body.set('image',file)
    try { const response=await fetch('/api/profile',{method:'POST',body}); if(!response.ok) throw new Error('upload'); const result=await response.json(); setProfileImage(result.url); setImportMessage('تصویر پروفایل روی سرور ذخیره شد و برای همه دستگاه‌ها قابل مشاهده است.') }
    catch { setImportMessage('ذخیره تصویر انجام نشد؛ سرویس سرور را بررسی کنید.') }
  }
  async function importFile(file?: File) {
    if (!file) return
    const text = await file.text()
    const rows = text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean).map(line=>line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell=>cell.replace(/^"|"$/g,'').replaceAll('""','"')))
    setImportedRows(rows); setImportMessage(rows.length+' ردیف از فایل خوانده شد. پیش‌نمایش آماده است؛ برای اتصال به BPMS باید ساختار ستون‌ها تطبیق داده شود.')
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
            <Image src={profileImage} alt={profileName} width={48} height={48} unoptimized />
          </span>
          <div className="sidebar-label"><strong>{profileName}</strong><small>واحد منابع انسانی</small></div><label className="profile-upload" title="انتخاب تصویر پروفایل"><Camera size={14}/><input type="file" accept="image/*" onChange={event=>uploadProfile(event.target.files?.[0])}/></label>
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
          <div className="actions"><button className="icon-button notification-button" aria-label="اعلان‌های تقویم" onClick={()=>setNotifications(!notifications)}><Bell size={17}/><i/></button>
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
        {view === 'وام‌ها' && <section className="panel glass" id="loan-summary"><div className="panel-head"><div><h2>پایش تسهیلات کارکنان</h2><p>تعداد و مجموع مبلغ هر نوع وام در واحدهای سازمانی · داده نمونه</p></div><Wallet/></div><div className="catalog-filters"><select value={loanKind} onChange={e=>setLoanKind(e.target.value)}><option>همه وام‌ها</option><option>کوتاه‌مدت</option><option>امتیازی</option><option>ضروری</option></select><select value={loanUnit} onChange={e=>setLoanUnit(e.target.value)}><option>همه واحدها</option>{unitNames.map(u=><option key={u}>{u}</option>)}</select></div><div className="cards loan-kpis"><article className="metric glass"><small>تعداد تسهیلات</small><strong>{fa(loanCount)}</strong></article><article className="metric glass"><small>مجموع مبلغ (ریال)</small><strong>{fa(loanTotal)}</strong></article></div><div className="table-wrap"><table><thead><tr><th>واحد سازمانی</th><th>نوع وام</th><th>تعداد دریافت‌کننده</th><th>مبلغ کل (ریال)</th></tr></thead><tbody>{loanRows.map((row,i)=><tr key={i}><td>{row.unit}</td><td>{row.kind}</td><td>{fa(row.count)}</td><td>{fa(row.amount)}</td></tr>)}</tbody></table></div></section>}
        {view === 'گزارش و ارائه' && <section className="panel glass" id="report-builder"><div className="panel-head"><div><h2>ساخت گزارش مدیریتی</h2><p>بخش‌های موردنیاز را انتخاب کنید؛ خروجی‌ها از همین انتخاب ساخته می‌شوند.</p></div><Presentation/></div><div className="report-checks">{reportOptions.map(o=><label key={o.id}><input type="checkbox" checked={reportChecks.includes(o.id)} onChange={e=>setReportChecks(old=>e.target.checked?[...old,o.id]:old.filter(x=>x!==o.id))}/>{o.label}</label>)}</div><div className="report-actions"><button className="export" onClick={download}><FileSpreadsheet size={16}/>دریافت Excel</button><button className="export" onClick={makeSlides}><Presentation size={16}/>دریافت PowerPoint</button><button className="icon-button" onClick={()=>importRef.current?.click()}><FileUp size={16}/>ورود فایل CSV</button><input ref={importRef} hidden type="file" accept=".csv,text/csv" onChange={e=>importFile(e.target.files?.[0])}/></div>{importMessage&&<p role="status" className="map-search-status">{importMessage}</p>}{importedRows.length>0&&<div className="table-wrap"><table><tbody>{importedRows.slice(0,12).map((row,i)=><tr key={i}>{row.slice(0,8).map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>}
        {view === 'سرویس کارکنان' && <div id="service-map" tabIndex={-1}><ServiceMap/></div>}
        {view === 'حضور و کارکرد' && <section className="cards">{attendance.map(({ id, name, value, unit, icon: Icon }) => <article className="metric glass" id={id} tabIndex={-1} key={id}><div className="metric-top"><span className="metric-icon rose"><Icon size={21}/></span>{name}</div><strong>{fa(value)}</strong><small>{unit} · منبع تعریف‌شده در اکسل: کسری</small></article>)}</section>}
        {view === 'منابع داده' && <section className="panel glass catalog" id="catalog" tabIndex={-1}><div className="panel-head"><div><h2>کاتالوگ داده‌ها</h2><p>{fa(shownSources.length)} فیلد · اتصال‌ها در انتظار تکمیل</p></div><span className="panel-icon"><Database size={19}/></span></div><div className="catalog-filters"><input id="catalog-filters" aria-label="جست‌وجوی فیلدها" placeholder="جست‌وجو در فیلدها…" value={query} onChange={event => setQuery(event.target.value)}/><select aria-label="مرجع داده" value={source} onChange={event => setSource(event.target.value)}><option value="">همه مراجع</option>{sourceGroups.map(group => <option key={group}>{group}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>فیلد</th><th>مرجع</th><th>روش دریافت / تیم</th></tr></thead><tbody>{shownSources.map(row => <tr key={row.field}><td>{row.field}</td><td>{row.source || '—'}</td><td>{row.method || '—'}</td></tr>)}</tbody></table>{shownSources.length === 0 && <p className="empty">فیلدی با این جست‌وجو پیدا نشد.</p>}</div></section>}
        <footer><span>دیدار · منابع انسانی الکتروکویر</span><button onClick={() => go('منابع داده')}>مراجع داده <ArrowLeft size={13}/></button></footer>
      </main>
      {notifications && <div className="notification-popover"><strong>یادآورهای تقویم</strong><p>برای مشاهدهٔ رویدادها و کارهای ثبت‌شده، تقویم شمسی را باز کنید.</p><button className="icon-button" onClick={()=>{setNotifications(false);go('تقویم شمسی')}}>رفتن به تقویم</button></div>}
      {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal glass" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={event => event.stopPropagation()}><div className="panel-head"><h2 id="help-title">راهنمای داشبورد</h2><button autoFocus className="icon-button" aria-label="بستن" onClick={() => setHelp(false)}><X size={20}/></button></div><p>از منوی بالای صفحه یا نمودار شعب، تهران و یزد را فیلتر کنید. خروجی CSV براساس نمای فعلی تهیه می‌شود.</p><p>شاخص‌ها با داده‌های نمایشی نمایش داده می‌شوند. فهرست منابع و روش دریافت آن‌ها در بخش «منابع داده» آمده است.</p></section></div>}
    </div>
  )
}
