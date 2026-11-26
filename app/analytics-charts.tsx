import type { CSSProperties } from 'react'
import { BarChart3, CalendarClock, ChartLine, CircleGauge } from 'lucide-react'
import { horizonCounts, horizons, loanTypes, money as fa, percent, unitStats, type Person } from '../lib/people'
import type { Route } from '../lib/service-routes'

export const chartLabels = {
  'gender-chart': 'ترکیب جنسیتی واحدها',
  'pay-chart': 'مقایسهٔ هزینهٔ واحدها',
  'grade-chart': 'نقشهٔ گروه و رتبه',
  'loan-chart': 'پوشش سه نوع وام',
  'loan-timeline': 'روند صف و پایان وام',
  'attendance-chart': 'توزیع دیرکرد و مرخصی',
  'transport-chart': 'مقایسهٔ خطوط سرویس',
} as const
export type ChartId = keyof typeof chartLabels

const tones = ['#ceb5f5', '#84c6dd', '#e6aa9f', '#a4d3ad']
const form = { maximumFractionDigits: 1 } as const
const number = (value: number) => value.toLocaleString('fa-IR', form)

function Legend({ items }: { items: string[] }) {
  return <div className="graph-legend">{items.map((item, index) => <span key={item}><i style={{ background: tones[index] }}/>{item}</span>)}</div>
}

export default function AnalyticsChart({ id, people = [], routes = [], embedded = false }: {
  id: ChartId; people?: Person[]; routes?: Route[]; embedded?: boolean
}) {
  const units = unitStats(people)
  const name = chartLabels[id]
  const total = people.length
  const header = (note: string, Icon = BarChart3) => <div className="panel-head"><div><h2>{name}</h2><p>{note}</p></div><span className="panel-icon"><Icon size={18}/></span></div>

  return <section className="panel glass analytics-graph" id={embedded ? undefined : id} tabIndex={embedded ? undefined : -1} aria-label={name}>
    {id === 'gender-chart' && <>
      {header('سهم زنان و مردان در هر واحد · تعداد واقعی در دادهٔ نمونه')}
      <Legend items={['زن', 'مرد']}/>
      <div className="graph-stacks">{units.map(unit => {
        const men = unit.members.length - unit.women
        const share = percent(unit.women, unit.members.length)
        return <div key={unit.name}>
          <span>{unit.name}</span>
          <div className="graph-stack" aria-label={unit.name + '، ' + fa(unit.women) + ' زن و ' + fa(men) + ' مرد'}>
            <i style={{ width: share + '%', background: tones[0] }}/><i style={{ width: (100 - share) + '%', background: tones[1] }}/>
          </div>
          <small>{fa(unit.women)} زن · {fa(men)} مرد</small>
        </div>
      })}</div>
    </>}

    {id === 'pay-chart' && <>
      {header('کل دریافتی و تعداد نفرات هر واحد · میلیون تومان')}
      <div className="graph-vbars">{[...units].sort((a,b) => b.payment - a.payment).map(unit => {
        const height = units.length ? unit.payment / Math.max(...units.map(row => row.payment)) * 100 : 0
        return <div key={unit.name} title={unit.name + ': ' + fa(unit.payment) + ' تومان، ' + fa(unit.members.length) + ' نفر'}>
          <div className="graph-vbar-track"><i style={{ height: height + '%' }}><b>{number(unit.payment / 1_000_000)}</b></i></div>
          <span>{unit.name}</span><small>{fa(unit.members.length)} نفر</small>
        </div>
      })}</div>
    </>}

    {id === 'grade-chart' && <>
      {header('شدت رنگ، تعداد نفرات هر گروه و رتبه را نشان می‌دهد.', CircleGauge)}
      <div className="table-wrap"><table className="graph-heat">
        <thead><tr><th>گروه / رتبه</th>{[1,2,3,4,5].map(rank => <th key={rank}>رتبهٔ {fa(rank)}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 17 }, (_, index) => {
          const cells = [1,2,3,4,5].map(rank => people.filter(person => person.group === index + 1 && person.rank === rank).length)
          return <tr key={index}><th>{fa(index + 1)}</th>{cells.map((count, rank) => <td key={rank} style={{ '--cell-alpha': Math.min(.8, .09 + count * .105) } as CSSProperties}>{fa(count)}</td>)}</tr>
        })}</tbody>
      </table></div>
    </>}

    {id === 'loan-chart' && <>
      {header('درصد کارکنان دارای وام پرداخت‌شده · هر نوع جداگانه', CircleGauge)}
      <div className="graph-rings">{loanTypes.map((type, index) => {
        const count = people.filter(person => person.loans.some(loan => loan.type === type && loan.status === 'پرداخت‌شده')).length
        const share = percent(count, total)
        return <div key={type}><div className="graph-ring" style={{ '--arc': share + '%', '--tone': tones[index] } as CSSProperties}><strong>{number(share)}٪</strong></div><b>{type}</b><small>{fa(count)} از {fa(total)} نفر</small></div>
      })}</div>
    </>}

    {id === 'loan-timeline' && <>
      {header('تعداد نفرات در بازه‌های تجمعی · از امروز', ChartLine)}
      <div className="graph-timelines">{loanTypes.map(type => {
        const queued = horizons.map(month => horizonCounts(people, month, 'در نوبت', type))
        const closing = horizons.map(month => horizonCounts(people, month, 'پرداخت‌شده', type))
        const max = Math.max(1, ...queued, ...closing)
        const points = (values: number[]) => values.map((value, i) => [20 + i * 80, 80 - (value / max * 65)] as const)
        return <article key={type}><h3>{type}</h3>
          <svg viewBox="0 0 280 96" role="img" aria-label={type + '، صف: ' + queued.map(fa).join('، ') + '؛ پایان: ' + closing.map(fa).join('، ')}>
            {[20,50,80].map(y => <line key={y} x1="20" x2="260" y1={y} y2={y} stroke="#bbc5e430"/>)}
            {[queued, closing].map((values, index) => <g key={index} stroke={tones[index]} fill={tones[index]}><polyline fill="none" strokeWidth="2.6" points={points(values).map(point => point.join(',')).join(' ')}/>{points(values).map(([x,y], i) => <circle key={i} cx={x} cy={y} r="3.4"/>)}</g>)}
          </svg>
          <div className="graph-axis">{['این ماه', '۳ ماه', '۶ ماه', 'یک‌سال'].map((month, i) => <span key={month}>{month}<b>{fa(queued[i])} / {fa(closing[i])}</b></span>)}</div>
        </article>
      })}</div><Legend items={['در نوبت', 'پایان بازپرداخت']}/>
    </>}

    {id === 'attendance-chart' && <>
      {header('دیرکرد و شاخص‌های مرخصی · تعداد نفرات', CalendarClock)}
      <div className="graph-attendance">
        {[
          ['به‌موقع', people.filter(person => !person.lateMinutes).length],
          ['دیرکرد ۱ تا ۵۹ دقیقه', people.filter(person => person.lateMinutes > 0 && person.lateMinutes < 60).length],
          ['دیرکرد ۶۰ تا ۱۷۹ دقیقه', people.filter(person => person.lateMinutes >= 60 && person.lateMinutes < 180).length],
          ['دیرکرد ۱۸۰ دقیقه و بیشتر', people.filter(person => person.lateMinutes >= 180).length],
          ['مرخصی امروز', people.filter(person => person.leaveToday).length],
          ['مرخصی روزهای بعد', people.filter(person => person.futureLeave).length],
        ].map(([label,count], index) => <div key={label}><span>{label}</span><div><i style={{ width: percent(Number(count), total) + '%', background: tones[index % tones.length] }}/></div><strong>{fa(Number(count))}</strong></div>)}
      </div>
    </>}

    {id === 'transport-chart' && <>
      {header('تعداد مسافران، مسافر ایستاده و استفاده‌کنندگان اسنپ برای هر خط')}
      <Legend items={['مسافران نشسته', 'مسافران ایستاده', 'اسنپ']}/>
      <div className="graph-stacks">{routes.map((route, i) => {
        const max = Math.max(1, ...routes.map(row => row.count + (row.snap ?? 0)))
        const standing = Math.min(route.standing ?? 0, route.count)
        const quantities = [route.count - standing, standing, route.snap ?? 0]
        return <div key={i}><span>خط {fa(i+1)}</span><div className="graph-stack">{quantities.map((value,index) => <i key={index} style={{ width: percent(value, max)+'%', background: tones[index] }}/>)}</div><small>{fa(route.count)} مسافر · {fa(standing)} ایستاده · {fa(route.snap ?? 0)} اسنپ</small></div>
      })}</div>
    </>}
  </section>
}
