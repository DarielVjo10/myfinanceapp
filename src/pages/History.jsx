import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { useLanguage } from '../contexts/LanguageContext'
import { buildMonthlyOverview, lastNPeriods, getBalanceSeriesGrouped } from '../services/analytics'
import { expensesByCategory } from '../services/expenses'
import { Card, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Input'
import { GranularitySelector } from '../components/ui/GranularitySelector'
import { MonthlyBarChart } from '../components/charts/MonthlyBarChart'
import { NetWorthLineChart } from '../components/charts/NetWorthLineChart'
import { SavingsAreaChart } from '../components/charts/SavingsAreaChart'
import { Skeleton } from '../components/ui/Feedback'
import { formatMoney, formatPercent, monthLabel } from '../utils/format'
import { percentChange, absoluteChange } from '../utils/finance'
import { TrendingUp, TrendingDown } from 'lucide-react'

const RANGE_OPTIONS = [
  { value: 3, label: 'Últimos 3 meses' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Últimos 12 meses' },
  { value: 0, label: 'Todo el historial' },
]

export default function History() {
  const { user } = useAuth()
  const { allPeriods } = usePeriod()
  const { language } = useLanguage()
  const [range, setRange] = useState(6)
  const [overview, setOverview] = useState(null)
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [netWorthGranularity, setNetWorthGranularity] = useState('month')
  const [netWorthSeries, setNetWorthSeries] = useState(null)
  const [categoryComparison, setCategoryComparison] = useState(null)

  useEffect(() => {
    if (!user || allPeriods.length === 0) return
    const periods = range === 0 ? allPeriods : lastNPeriods(allPeriods, range)
    buildMonthlyOverview(user.id, periods).then(setOverview)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allPeriods, range])

  useEffect(() => {
    if (!user) return
    getBalanceSeriesGrouped(user.id, { entityType: 'networth', granularity: netWorthGranularity, lang: language }).then(setNetWorthSeries)
  }, [user, netWorthGranularity, language])

  useEffect(() => {
    if (!user || allPeriods.length === 0) return
    const last3 = lastNPeriods(allPeriods, 3)
    Promise.all(last3.map((p) => expensesByCategory(user.id, p.id))).then((results) => {
      const names = new Set()
      results.forEach((r) => r.forEach((c) => names.add(c.name)))
      const rows = [...names].map((name) => ({
        name,
        totals: results.map((r) => r.find((c) => c.name === name)?.total ?? 0),
      })).sort((a, b) => b.totals[b.totals.length - 1] - a.totals[a.totals.length - 1])
      setCategoryComparison({ periods: last3, rows })
    })
  }, [user, allPeriods])

  useEffect(() => {
    if (allPeriods.length >= 2) {
      setCompareA(allPeriods[allPeriods.length - 2].id)
      setCompareB(allPeriods[allPeriods.length - 1].id)
    }
  }, [allPeriods])

  const comparison = useMemo(() => {
    if (!overview) return null
    const a = overview.find((o) => o.periodId === compareA)
    const b = overview.find((o) => o.periodId === compareB)
    if (!a || !b) return null
    return { a, b }
  }, [overview, compareA, compareB])

  if (!overview) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-semibold text-xl text-ink">Historial</h1>
        <Select value={range} onChange={(e) => setRange(Number(e.target.value))} className="max-w-[200px]">
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>

      <Card>
        <CardHeader title="Ingresos vs Gastos vs Ahorros" />
        <MonthlyBarChart data={overview} />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Patrimonio Neto"
            subtitle="Evolución histórica"
            action={<GranularitySelector value={netWorthGranularity} onChange={setNetWorthGranularity} />}
          />
          {netWorthSeries ? (
            <>
              <NetWorthLineChart data={netWorthSeries.points} dataKey="value" />
              {netWorthSeries.note && <p className="text-xs text-ink-faint mt-2">{netWorthSeries.note}</p>}
            </>
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </Card>
        <Card>
          <CardHeader title="Ahorro acumulado" />
          <SavingsAreaChart
            data={overview.map((o, i, arr) => ({
              label: o.label,
              cumulative: arr.slice(0, i + 1).reduce((s, x) => s + x.savings, 0),
            }))}
          />
        </Card>
      </div>

      {categoryComparison && categoryComparison.rows.length > 0 && (
        <Card>
          <CardHeader title="Comparación de categorías" subtitle="Gasto por categoría, últimos 3 meses" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-faint text-xs">
                  <th className="pb-2 font-medium">Categoría</th>
                  {categoryComparison.periods.map((p) => (
                    <th key={p.id} className="pb-2 font-medium text-right tabular">{monthLabel(p.year, p.month, language)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoryComparison.rows.map((row) => (
                  <tr key={row.name}>
                    <td className="py-2 text-ink">{row.name}</td>
                    {row.totals.map((t, i) => (
                      <td key={i} className="py-2 text-right tabular text-ink-muted">{formatMoney(t)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Comparar meses" subtitle="Elige dos períodos para ver la variación" />
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
            {allPeriods.map((p) => <option key={p.id} value={p.id}>{monthLabel(p.year, p.month)}</option>)}
          </Select>
          <Select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
            {allPeriods.map((p) => <option key={p.id} value={p.id}>{monthLabel(p.year, p.month)}</option>)}
          </Select>
        </div>

        {comparison && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ComparisonStat label="Ingresos" a={comparison.a.income} b={comparison.b.income} />
            <ComparisonStat label="Gastos" a={comparison.a.expenses} b={comparison.b.expenses} invert />
            <ComparisonStat label="Ahorro" a={comparison.a.savings} b={comparison.b.savings} />
            <ComparisonStat label="Patrimonio" a={comparison.a.netWorth} b={comparison.b.netWorth} />
          </div>
        )}
      </Card>
    </div>
  )
}

function ComparisonStat({ label, a, b, invert = false }) {
  const change = percentChange(b, a)
  const diff = absoluteChange(b, a)
  const isGood = invert ? change <= 0 : change >= 0

  return (
    <div>
      <p className="text-ink-faint text-xs mb-1">{label}</p>
      <p className="tabular font-display font-semibold text-ink">{formatMoney(b)}</p>
      <div className={`flex items-center gap-1 text-xs mt-0.5 ${isGood ? 'text-emerald-500' : 'text-alert'}`}>
        {isGood ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span className="tabular">{formatPercent(Math.abs(change))}</span>
        <span className="text-ink-faint">({formatMoney(diff)})</span>
      </div>
    </div>
  )
}
