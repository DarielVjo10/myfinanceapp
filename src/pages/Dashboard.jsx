import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { totalIncomeForPeriod } from '../services/incomes'
import { totalExpensesForPeriod, expensesByCategory } from '../services/expenses'
import { totalSavingsForPeriod, listGoalsWithBalances } from '../services/savings'
import { getNetWorthForPeriod, getNetWorthHistory } from '../services/networth'
import { getAccountBalancesForPeriod } from '../services/accounts'
import { percentChange, savingsRate } from '../utils/finance'
import { FinancialHero } from '../components/dashboard/FinancialHero'
import { KpiGrid } from '../components/dashboard/KpiGrid'
import { GoalRing } from '../components/dashboard/GoalRing'
import { Card, CardHeader } from '../components/ui/Card'
import { CategoryDonut } from '../components/charts/CategoryDonut'
import { Skeleton, EmptyState } from '../components/ui/Feedback'
import { PiggyBank } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!user || !currentPeriod) return
    let active = true
    setLoading(true)

    ;(async () => {
      const [income, expenses, savings, netWorth, goals, categoryBreakdown, balances] = await Promise.all([
        totalIncomeForPeriod(user.id, currentPeriod.id),
        totalExpensesForPeriod(user.id, currentPeriod.id),
        totalSavingsForPeriod(user.id, currentPeriod.id),
        getNetWorthForPeriod(user.id, currentPeriod.id),
        listGoalsWithBalances(user.id),
        expensesByCategory(user.id, currentPeriod.id),
        getAccountBalancesForPeriod(user.id, currentPeriod.id),
      ])

      // patrimonio del período anterior para calcular % de crecimiento
      const history = await getNetWorthHistory(user.id)
      const idx = history.findIndex((h) => h.period_id === currentPeriod.id)
      const previousNetWorth = idx > 0 ? history[idx - 1].net_worth : null

      if (!active) return
      setData({
        income,
        expenses,
        savings,
        netWorth: Number(netWorth.net_worth ?? 0),
        growthPct: previousNetWorth ? percentChange(netWorth.net_worth, previousNetWorth) : 0,
        goals,
        categoryBreakdown,
        available: balances.reduce((s, b) => s + Number(b.balance), 0),
      })
      setLoading(false)
    })()

    return () => { active = false }
  }, [user, currentPeriod])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  const rate = savingsRate(data.income, data.expenses)
  const totalMover = data.expenses + data.savings
  const remaining = data.income - totalMover

  const kpis = [
    { label: 'Total a Mover', value: totalMover },
    { label: 'Restante', value: remaining },
    { label: 'Total Ahorrado', value: data.savings },
    { label: 'Tasa de Ahorro', value: rate, isPercent: true },
    { label: 'Patrimonio Neto', value: data.netWorth },
    { label: 'Disponible', value: data.available },
  ]

  return (
    <div className="space-y-6">
      <FinancialHero
        netWorth={data.netWorth}
        growthPct={data.growthPct}
        income={data.income}
        expenses={data.expenses}
        savings={data.savings}
        available={data.available}
      />

      <KpiGrid kpis={kpis} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Gastos por categoría" subtitle="Mes actual" />
          <CategoryDonut data={data.categoryBreakdown} />
        </Card>

        <Card>
          <CardHeader title="Metas de ahorro" subtitle="Progreso acumulado" />
          {data.goals.length === 0 ? (
            <EmptyState icon={PiggyBank} title="Sin metas aún" description="Crea una meta en Ajustes para empezar a rastrear tu progreso." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
              {data.goals.map((goal) => (
                <GoalRing
                  key={goal.id}
                  label={goal.name}
                  current={goal.balance}
                  target={goal.target_amount || goal.balance || 1}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
