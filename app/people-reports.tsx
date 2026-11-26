'use client'

import AnalyticsChart, { type ChartId } from './analytics-charts'
import { useState, type ReactNode } from 'react'
import { ArrowLeft, Banknote, GitBranch, Users } from 'lucide-react'
import type { City } from '../lib/dashboard'
import { horizonCounts, horizons, loanTypes, money as fa, orgUnits, peopleAt, percent, sum, unitStats, type Person } from '../lib/people'

type Cell = ReactNode
type Mode = 'workforce' | 'finance' | 'attendance' | 'loans'
const chartGroups: Record<Mode, ChartId[]> = {
  workforce: ['gender-chart'], finance: ['pay-chart', 'grade-chart'],
  attendance: ['attendance-chart'], loans: ['loan-chart', 'loan-timeline'],
}

function Table({ columns, rows, empty = 'موردی در این انتخاب وجود ندارد.' }: { columns: string[]; rows: Cell[][]; empty?: string }) {
  return <div className="table-wrap"><table className="analytics-table">
    <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{value}</td>)}</tr>)}</tbody>
  </table>{!rows.length && <p className="empty">{empty}</p>}</div>
}

export default function PeopleReports({ city, mode }: { city: City; mode: Mode }) {
  const [unit, setUnit] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [details, setDetails] = useState(false)
  const all = peopleAt(city)
  const selected = unit ? all.filter(person => person.unit === unit) : all
  const units = unitStats(all)
  const shownUnits = unitStats(selected)
  const paid = (person: Person) => person.loans.filter(loan => loan.status === 'پرداخت‌شده')
  const womenFirst = [...units].sort((a,b) => b.women - a.women)
  const positiveWomen = womenFirst.filter(item => item.women > 0).at(-1)?.women
  const maxWomen = womenFirst[0]?.women
  const names = (rows: typeof units) => rows.length ? rows.map(row => row.name).join('، ') : '—'
  const leaveFilters = [
    { label: 'ملزم به استفاده', test: (p: Person) => p.requiredLeave },
    { label: 'مانده صفر', test: (p: Person) => p.leaveBalance === 0 },
    { label: 'مانده منفی', test: (p: Person) => p.leaveBalance < 0 },
    { label: 'دیرکرد بالا', test: (p: Person) => p.lateMinutes >= 180 },
    { label: 'به‌موقع', test: (p: Person) => p.lateMinutes === 0 },
    { label: 'مرخصی امروز', test: (p: Person) => p.leaveToday },
    { label: 'مرخصی روزهای بعد', test: (p: Person) => p.futureLeave },
  ]
  const leaveTest = leaveFilters.find(item => item.label === filter)?.test
  const matches = selected.filter(person =>
    (!query.trim() || [person.name, person.team, person.unit].some(value => value.includes(query.trim()))) &&
    (mode === 'attendance' && leaveTest ? leaveTest(person) : mode === 'loans' && filter === 'بدون وام' ? paid(person).length === 0 : mode === 'finance' && filter === 'درحال تحصیل' ? person.student : true),
  ).sort((a,b) => mode === 'attendance' && filter === 'دیرکرد بالا' ? b.lateMinutes - a.lateMinutes : a.id - b.id)

  function drill(value: string) {
    setUnit(value)
    setDetails(true)
  }

  return <div className="hr-analytics">
    {mode === 'workforce' && <section className="panel glass org-flow" id="org-chart" tabIndex={-1}>
      <div className="panel-head"><div><h2>ساختار سازمانی الکتروکویر</h2><p>چارت ۱۴۰۵/۰۵/۰۴ · برای مشاهدهٔ اعضا، واحد را انتخاب کنید.</p></div><GitBranch size={20}/></div>
      <div className="org-root"><span>هیئت‌مدیره</span><ArrowLeft size={16}/><span>مدیرعامل</span></div>
      <div className="org-grid">{orgUnits.map(node => {
        const stat = units.find(item => item.name === node.name)
        return stat && <button key={node.name} className="org-node" onClick={() => drill(node.name)} aria-pressed={unit === node.name}>
          <strong>{node.name}</strong><small>{node.children.join(' · ') || 'واحد مستقیم'}</small><b>{fa(stat.members.length)} نفر</b>
        </button>
      })}</div>
    </section>}

    {chartGroups[mode].map(id => <AnalyticsChart key={id} id={id} people={selected}/>)}
    <section className="panel glass" id={mode + "-summary"} tabIndex={-1}>
      <div className="panel-head"><div><h2>{mode === 'workforce' ? 'پراکندگی کارکنان' : mode === 'finance' ? 'هزینه و دریافتی واحدها' : mode === 'loans' ? 'پوشش وام به تفکیک واحد' : 'وضعیت مرخصی و ورود'}</h2><p>دادهٔ نمونه · {city}</p></div><Users size={20}/></div>
      <div className="catalog-filters"><select aria-label="واحد سازمانی" value={unit} onChange={event => setUnit(event.target.value)}><option value="">همه واحدها</option>{units.map(row => <option key={row.name}>{row.name}</option>)}</select></div>

      {mode === 'workforce' && <>
        <div className="quick-stat-grid">
          <div><small>بیشترین تعداد خانم · {fa(maxWomen ?? 0)} نفر</small><strong>{names(womenFirst.filter(item => item.women === maxWomen))}</strong></div>
          <div><small>کمترین تعداد غیرصفر · {fa(positiveWomen ?? 0)} نفر</small><strong>{names(womenFirst.filter(item => item.women === positiveWomen))}</strong></div>
          <div><small>واحد بدون کارمند خانم</small><strong>{names(womenFirst.filter(item => item.women === 0))}</strong></div>
        </div>
        <Table columns={['واحد', 'کل', 'زن', 'مرد', 'سهم زنان']} rows={shownUnits.map(row => [<button className="table-link" onClick={() => drill(row.name)}>{row.name}</button>, fa(row.members.length), fa(row.women), fa(row.members.length - row.women), fa(percent(row.women, row.members.length)) + '٪'])}/>
      </>}

      {mode === 'finance' && <>
        <Table columns={['واحد', 'نفرات', 'مجموع دریافتی (تومان)', 'سرانه (تومان)', 'در حال تحصیل']} rows={[...shownUnits].sort((a,b) => b.payment - a.payment).map(row => [
          <button className="table-link" onClick={() => drill(row.name)}>{row.name}</button>, fa(row.members.length), fa(row.payment), fa(Math.round(row.payment / row.members.length)), fa(row.students),
        ])}/>
        <div className="section-title"><h2>توزیع گروه و رتبه</h2><span>گروه‌های ۱ تا ۱۷</span></div>
        <Table columns={['گروه', 'تعداد نفرات', 'رتبهٔ ۱', 'رتبهٔ ۲', 'رتبهٔ ۳', 'رتبهٔ ۴', 'رتبهٔ ۵']} rows={Array.from({length:17}, (_, i) => {
          const members = selected.filter(person => person.group === i + 1)
          return [fa(i + 1), fa(members.length), ...[1,2,3,4,5].map(rank => fa(members.filter(person => person.rank === rank).length))]
        })}/>
        <button className="icon-button hr-detail-toggle" aria-pressed={filter === 'درحال تحصیل'} onClick={() => { setFilter(filter ? '' : 'درحال تحصیل'); setDetails(true) }}>فهرست افراد در حال تحصیل · {fa(selected.filter(person => person.student).length)}</button>
      </>}

      {mode === 'attendance' && <div className="quick-stat-grid">{leaveFilters.map(item => <button key={item.label} aria-pressed={filter === item.label} onClick={() => { setFilter(filter === item.label ? '' : item.label); setDetails(true) }}><small>{item.label}</small><strong>{fa(selected.filter(item.test).length)}</strong></button>)}</div>}

      {mode === 'loans' && <>
        <div className="quick-stat-grid">{loanTypes.map(type => {
          const records = selected.flatMap(person => paid(person).filter(loan => loan.type === type))
          return <div key={type}><small>وام {type} · {fa(records.length)} فقره</small><strong>{fa(sum(records, loan => loan.amount))} تومان</strong></div>
        })}</div>
        <Table columns={['واحد', 'پوشش کل', ...loanTypes]} rows={shownUnits.map(row => {
          const frequency = (test: (person: Person) => boolean) => {
            const count = row.members.filter(test).length
            return fa(count) + ' نفر · ' + fa(percent(count, row.members.length)) + '٪'
          }
          return [<button className="table-link" onClick={() => drill(row.name)}>{row.name}</button>, frequency(p => paid(p).length > 0), ...loanTypes.map(type => frequency(p => paid(p).some(loan => loan.type === type)))]
        })}/>
        <div className="section-title"><h2>صف وام و پایان بازپرداخت</h2><span>بازه‌های تجمعی از امروز</span></div>
        <Table columns={['نوع و وضعیت', 'این ماه', '۳ ماه', '۶ ماه', 'یک‌سال']} rows={loanTypes.flatMap(type =>
          (['در نوبت','پرداخت‌شده'] as const).map(status => [type + ' · ' + (status === 'در نوبت' ? status : 'پایان بازپرداخت'), ...horizons.map(months => fa(horizonCounts(selected, months, status, type)))])
        )}/>
        <button className="icon-button hr-detail-toggle" aria-pressed={filter === 'بدون وام'} onClick={() => { setFilter(filter ? '' : 'بدون وام'); setDetails(true) }}><Banknote size={16}/>بدون وام پرداخت‌شده · {fa(selected.filter(person => !paid(person).length).length)}</button>
      </>}
    </section>

    <section className="panel glass" id={mode + "-details"} tabIndex={-1}>
      <div className="panel-head"><div><h2>جزئیات کارکنان</h2><p>{unit || 'همه واحدها'} · {fa(matches.length)} نفر</p></div><button className="icon-button" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? 'جمع کردن فهرست' : 'نمایش فهرست نفرات'}</button></div>
      {details && <>
        <div className="catalog-filters"><input aria-label="جست‌وجوی کارکنان" placeholder="نام، واحد یا تیم" value={query} onChange={event => setQuery(event.target.value)}/></div>
        <Table columns={['همکار', 'محل خدمت', 'واحد / تیم', 'جنسیت', ...(mode === 'finance' ? ['دریافتی (تومان)', 'گروه', 'رتبه', 'تحصیل'] : mode === 'loans' ? ['وام و وضعیت'] : mode === 'attendance' ? ['ماندهٔ مرخصی (روز)', 'دیرکرد (دقیقه)', 'وضعیت'] : [])]}
          rows={matches.map(person => [
            person.name, person.city === 'یزد' ? 'کارخانه یزد' : 'دفتر تهران', person.unit + (person.team === person.unit ? '' : ' / ' + person.team), person.gender,
            ...(mode === 'finance' ? [fa(person.payment), fa(person.group), fa(person.rank), person.student ? 'در حال تحصیل' : '—']
              : mode === 'loans' ? [person.loans.map(loan => loan.type + ' · ' + loan.status + ' · ' + fa(loan.amount) + ' تومان · ' + (loan.status === 'در نوبت' ? 'نوبت ' : 'پایان ') + loan.date).join(' | ') || 'بدون پروندهٔ وام']
              : mode === 'attendance' ? [fa(person.leaveBalance), fa(person.lateMinutes), [person.requiredLeave && 'ملزم به استفاده', person.leaveToday && 'مرخصی امروز', person.futureLeave && 'مرخصی آتی'].filter(Boolean).join('، ') || '—'] : []),
          ])}/>
      </>}
    </section>
  </div>
}
