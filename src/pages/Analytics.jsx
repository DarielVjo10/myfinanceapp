import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { getInterestSettings, upsertInterestSettings, getFinancialSettings } from '../services/settings'
import { buildMonthlyOverview, lastNPeriods } from '../services/analytics'
import { expensesByCategory } from '../services/expenses'
import { listCategories, getBudgetUsageForPeriod } from '../services/categories'
import { totalIncomeForPeriod } from '../services/incomes'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { CompoundProjectionChart } from '../components/charts/CompoundProjectionChart'
import { Skeleton } from '../components/ui/Feedback'
import { formatMoney, formatPercent } from '../utils/format'
import { projectCompoundInterest, projectSimpleSavings, calculate503020 } from '../utils/finance'
import { Sparkles } from 'lucide-react'

const HORIZONS = [1, 3, 5, 10]

export default function Analytics() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState(null)
  const [form, setForm] = useState({
    initialCapital: 0, monthlyContribution: 0, annualRate: 0, compoundingFrequency: 'monthly',
  })
  const [horizon, setHorizon] = useState(5)
  const [budgetSplit, setBudgetSplit] = useState({ needs: 50, wants: 30, savings: 20 })
  const [actualSplit, setActualSplit] = useState(null)
  const [insights, setInsights] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !currentPeriod) return
    let active = true
    setLoading(true)

    ;(async () => {
      const [interest, financial] = await Promise.all([
        getInterestSettings(user.id),
        getFinancialSettings(user.id),
      ])
      if (!active) return
      if (interest) {
        setSettingsId(interest.id)
        setForm({
          initialCapital: interest.initial_capital,
          monthlyContribution: interest.monthly_contribution,
          annualRate: interest.annual_rate,
          compoundingFrequency: interest.compounding_frequency,
        })
      }
      if (financial) {
        setBudgetSplit({ needs: financial.needs_pct, wants: financial.wants_pct, savings: financial.savings_pct })
      }

      // 50/30/20 real del mes actual
      const [categories, breakdown, income] = await Promise.all([
        listCategories(user.id),
        expensesByCategory(user.id, currentPeriod.id),
        totalIncomeForPeriod(user.id, currentPeriod.id),
      ])
      const classByName = Object.fromEntries(categories.map((c) => [c.name, c.classification]))
      let needsSpent = 0, wantsSpent = 0
      for (const b of breakdown) {
        const cls = classByName[b.name]
        if (cls === 'needs') needsSpent += b.total
        else wantsSpent += b.total
      }

      const budgetUsage = await getBudgetUsageForPeriod(user.id, currentPeriod.id)

      const periods = lastNPeriods(allPeriods, 7) // últimos 6 + actual, para el promedio
      const monthly = await buildMonthlyOverview(user.id, periods)
      const currentMonth = monthly.find((m) => m.periodId === currentPeriod.id)
      const priorMonths = monthly.filter((m) => m.periodId !== currentPeriod.id)
      const avgExpenses = priorMonths.length
        ? priorMonths.reduce((s, m) => s + m.expenses, 0) / priorMonths.length
        : null

      if (!active) return
      setActualSplit(calculate503020({ needsSpent, wantsSpent, savingsAmount: currentMonth?.savings ?? 0, income }))

      // Insights basados en datos reales, nunca inventados
      const built = []
      if (avgExpenses !== null && currentMonth) {
        const diffPct = ((currentMonth.expenses - avgExpenses) / (avgExpenses || 1)) * 100
        built.push(
          diffPct <= 0
            ? `Este mes gastaste ${formatPercent(Math.abs(diffPct))} menos que tu promedio de los últimos ${priorMonths.length} meses.`
            : `Este mes gastaste ${formatPercent(diffPct)} más que tu promedio de los últimos ${priorMonths.length} meses.`
        )
      }
      if (currentMonth) {
        built.push(`Tu tasa de ahorro este mes es de ${formatPercent(currentMonth.savingsRate)}.`)
      }
      if (priorMonths.length > 0) {
        const priorSavingsAvg = priorMonths.reduce((s, m) => s + m.savings, 0) / priorMonths.length
        if (currentMonth) {
          const savDiff = currentMonth.savings - priorSavingsAvg
          built.push(
            savDiff >= 0
              ? `Ahorraste ${formatMoney(savDiff)} más que tu promedio mensual reciente.`
              : `Ahorraste ${formatMoney(Math.abs(savDiff))} menos que tu promedio mensual reciente.`
          )
        }
      }
      for (const u of budgetUsage) {
        if (u.pct >= 90) {
          built.push(`Ya usaste ${formatPercent(u.pct)} del presupuesto de ${u.categoryName} este mes.`)
        }
      }

      setInsights(built)
      setLoading(false)
    })()

    return () => { active = false }
  }, [user, currentPeriod, allPeriods])

  const projection = useMemo(() => {
    const compound = projectCompoundInterest({
      initialCapital: Number(form.initialCapital),
      monthlyContribution: Number(form.monthlyContribution),
      annualRate: Number(form.annualRate),
      compoundingFrequency: form.compoundingFrequency,
      years: horizon,
    })
    const simple = projectSimpleSavings({
      initialCapital: Number(form.initialCapital),
      monthlyContribution: Number(form.monthlyContribution),
      years: horizon,
    })
    return { compound, simple }
  }, [form, horizon])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    const updated = await upsertInterestSettings(user.id, settingsId, {
      initial_capital: Number(form.initialCapital),
      monthly_contribution: Number(form.monthlyContribution),
      annual_rate: Number(form.annualRate),
      compounding_frequency: form.compoundingFrequency,
    })
    setSettingsId(updated.id)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display font-semibold text-xl text-ink">Analítica</h1>

      <Card>
        <CardHeader
          title="Interés compuesto"
          subtitle="Proyección vs ahorro simple"
          action={
            <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="max-w-[120px]">
              {HORIZONS.map((h) => <option key={h} value={h}>{h} {h === 1 ? 'año' : 'años'}</option>)}
            </Select>
          }
        />

        <form onSubmit={handleSaveSettings} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Field label="Capital inicial">
            <Input type="number" step="0.01" value={form.initialCapital} onChange={(e) => setForm({ ...form, initialCapital: e.target.value })} />
          </Field>
          <Field label="Aporte mensual">
            <Input type="number" step="0.01" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} />
          </Field>
          <Field label="Tasa anual %">
            <Input type="number" step="0.01" value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })} />
          </Field>
          <Field label="Capitalización">
            <Select value={form.compoundingFrequency} onChange={(e) => setForm({ ...form, compoundingFrequency: e.target.value })}>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="annually">Anual</option>
              <option value="daily">Diaria</option>
            </Select>
          </Field>
          <div className="col-span-2 md:col-span-4">
            <Button type="submit" loading={saving} variant="secondary">Guardar configuración</Button>
          </div>
        </form>

        <CompoundProjectionChart compoundTimeline={projection.compound.timeline} simpleTimeline={projection.simple.timeline} />

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-ink-faint text-xs mb-1">Capital final (compuesto)</p>
            <p className="tabular font-display font-semibold text-emerald-500">{formatMoney(projection.compound.finalCapital)}</p>
          </div>
          <div>
            <p className="text-ink-faint text-xs mb-1">Total aportado</p>
            <p className="tabular font-display font-semibold text-ink">{formatMoney(projection.compound.totalContributed)}</p>
          </div>
          <div>
            <p className="text-ink-faint text-xs mb-1">Interés generado</p>
            <p className="tabular font-display font-semibold text-ink">{formatMoney(projection.compound.totalInterest)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="50 / 30 / 20" subtitle="Actual vs objetivo (este mes)" />
        <div className="grid grid-cols-3 gap-4">
          <SplitBar label="Necesidades" actual={actualSplit?.needsPct ?? 0} target={budgetSplit.needs} />
          <SplitBar label="Deseos" actual={actualSplit?.wantsPct ?? 0} target={budgetSplit.wants} />
          <SplitBar label="Ahorro" actual={actualSplit?.savingsPct ?? 0} target={budgetSplit.savings} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Insights" subtitle="Basados en tu historial real" />
        {insights.length === 0 ? (
          <p className="text-ink-faint text-sm">Aún no hay suficiente historial para generar insights.</p>
        ) : (
          <ul className="space-y-2.5">
            {insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
                <Sparkles size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function SplitBar({ label, actual, target }) {
  const diff = actual - target
  return (
    <div>
      <p className="text-xs text-ink-faint mb-1.5">{label}</p>
      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden mb-1">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(actual, 100)}%` }} />
      </div>
      <p className="tabular text-sm font-medium text-ink">{formatPercent(actual)}</p>
      <p className={`text-xs ${diff > 0 ? 'text-alert' : 'text-emerald-500'}`}>
        objetivo {formatPercent(target)} ({diff > 0 ? '+' : ''}{formatPercent(diff)})
      </p>
    </div>
  )
}
