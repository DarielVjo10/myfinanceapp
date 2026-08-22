import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { totalIncomeForPeriod } from '../services/incomes'
import { totalExpensesForPeriod, expensesByCategory, getExpensedCategoryIds, createExpense } from '../services/expenses'
import { listCategories } from '../services/categories'
import { totalSavingsForPeriod, listGoalsWithBalances } from '../services/savings'
import { getNetWorthForPeriod, getNetWorthHistory } from '../services/networth'
import { getAccountBalancesForPeriod } from '../services/accounts'
import { getPendingRecurringForPeriod, getLastActualAmount, confirmRecurringExpenses } from '../services/recurring'
import { getLatestRatesToDOP } from '../services/exchangeRates'
import { percentChange, savingsRate, convertToDOP } from '../utils/finance'
import { FinancialHero } from '../components/dashboard/FinancialHero'
import { KpiGrid } from '../components/dashboard/KpiGrid'
import { GoalRing } from '../components/dashboard/GoalRing'
import { Card, CardHeader } from '../components/ui/Card'
import { CategoryDonut } from '../components/charts/CategoryDonut'
import { Skeleton, EmptyState } from '../components/ui/Feedback'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { formatMoney } from '../utils/format'
import { PiggyBank, Repeat, AlertTriangle, CalendarClock, Check } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [pendingRecurring, setPendingRecurring] = useState([])
  const [recurringModalOpen, setRecurringModalOpen] = useState(false)
  const [confirmItems, setConfirmItems] = useState([])
  const [confirmingRecurring, setConfirmingRecurring] = useState(false)
  const [upcomingPayments, setUpcomingPayments] = useState([])
  const [payingCategoryId, setPayingCategoryId] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  const load = async () => {
    const [income, expenses, savings, netWorth, goals, categoryBreakdown, balances, ratesToDOP] = await Promise.all([
      totalIncomeForPeriod(user.id, currentPeriod.id),
      totalExpensesForPeriod(user.id, currentPeriod.id),
      totalSavingsForPeriod(user.id, currentPeriod.id),
      getNetWorthForPeriod(user.id, currentPeriod.id),
      listGoalsWithBalances(user.id),
      expensesByCategory(user.id, currentPeriod.id),
      getAccountBalancesForPeriod(user.id, currentPeriod.id),
      getLatestRatesToDOP(user.id),
    ])
    // los gastos recurrentes son una mejora aparte: si falla, no debe tumbar el resto del panel
    const pendingTemplates = await getPendingRecurringForPeriod(user.id, currentPeriod.id).catch(() => [])

    // próximos pagos: categorías con fecha límite que aún no se han pagado este período
    const [allCategories, expensedCategoryIds] = await Promise.all([
      listCategories(user.id),
      getExpensedCategoryIds(user.id, currentPeriod.id),
    ])
    const upcoming = allCategories
      .filter((c) => c.due_day && !expensedCategoryIds.has(c.id))
      .sort((a, b) => a.due_day - b.due_day)
    setUpcomingPayments(upcoming)

    // patrimonio del período anterior para calcular % de crecimiento
    const history = await getNetWorthHistory(user.id)
    const idx = history.findIndex((h) => h.period_id === currentPeriod.id)
    const previousNetWorth = idx > 0 ? history[idx - 1].net_worth : null

    setData({
      income,
      expenses,
      savings,
      netWorth: Number(netWorth.net_worth ?? 0),
      growthPct: previousNetWorth ? percentChange(netWorth.net_worth, previousNetWorth) : 0,
      goals,
      categoryBreakdown,
      // convierte cada cuenta a DOP con la tasa más reciente antes de sumar
      available: balances.reduce((s, b) => {
        const converted = convertToDOP(b.balance, b.accounts?.currency, ratesToDOP)
        return converted === null ? s : s + converted
      }, 0),
    })
    setPendingRecurring(expenses === 0 ? pendingTemplates : [])
    setLoading(false)
  }

  useEffect(() => {
    if (!user || !currentPeriod) return
    let active = true
    setLoading(true)
    load().catch(() => { if (active) setLoading(false) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const openRecurringModal = async () => {
    const items = await Promise.all(
      pendingRecurring.map(async (t) => {
        const lastActual = await getLastActualAmount(user.id, t.id)
        return {
          templateId: t.id,
          categoryId: t.category_id,
          categoryName: t.expense_categories?.name,
          accountId: t.account_id,
          description: t.description,
          amount: Number(t.amount),
          lastActual,
          changed: lastActual != null && Number(lastActual) !== Number(t.amount),
          skip: false,
        }
      })
    )
    setConfirmItems(items)
    setRecurringModalOpen(true)
  }

  const updateConfirmItem = (templateId, patch) => {
    setConfirmItems((items) => items.map((i) => (i.templateId === templateId ? { ...i, ...patch } : i)))
  }

  const handleConfirmRecurring = async () => {
    setConfirmingRecurring(true)
    const toCreate = confirmItems.filter((i) => !i.skip)
    await confirmRecurringExpenses(user.id, currentPeriod.id, toCreate)
    setConfirmingRecurring(false)
    setRecurringModalOpen(false)
    load()
  }

  const handleMarkPaid = async (category) => {
    if (!payAmount) return
    const daysInMonth = new Date(currentPeriod.year, currentPeriod.month, 0).getDate()
    const day = Math.min(category.due_day, daysInMonth)
    const expenseDate = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    await createExpense(user.id, currentPeriod.id, {
      categoryId: category.id,
      amount: Number(payAmount),
      description: `${category.name} (pago)`,
      expenseDate,
    })
    setPayingCategoryId(null)
    setPayAmount('')
    load()
  }

  // solo la primera carga muestra el skeleton — cambiar de mes actualiza los
  // datos en el sitio en vez de desmontar todo el panel (evita el "salto")
  if (!data) {
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
    <motion.div
      className="space-y-6"
      animate={{ opacity: loading ? 0.6 : 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
    >
      {pendingRecurring.length > 0 && (
        <div className="flex items-center justify-between gap-4 bg-info/10 border border-info/30 rounded-xl2 px-5 py-4">
          <div className="flex items-center gap-3">
            <Repeat size={18} className="text-info shrink-0" />
            <p className="text-sm text-ink">
              Tienes {pendingRecurring.length} gasto{pendingRecurring.length === 1 ? '' : 's'} recurrente{pendingRecurring.length === 1 ? '' : 's'} sin confirmar este mes. ¿Confirmar todos?
            </p>
          </div>
          <Button variant="secondary" onClick={openRecurringModal} className="shrink-0">Revisar</Button>
        </div>
      )}

      <FinancialHero
        netWorth={data.netWorth}
        growthPct={data.growthPct}
        income={data.income}
        expenses={data.expenses}
        savings={data.savings}
        available={data.available}
      />

      <KpiGrid kpis={kpis} />

      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader title="Próximos pagos" subtitle="Categorías con fecha límite sin pagar este mes" icon={CalendarClock} />
          <ul className="divide-y divide-border">
            {upcomingPayments.map((c) => (
              <li key={c.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={14} className="text-ink-faint" />
                    <span className="text-sm font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-ink-faint">vence el día {c.due_day}</span>
                  </div>
                  {payingCategoryId === c.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        autoFocus
                        placeholder="Monto"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="max-w-[110px] tabular"
                      />
                      <button onClick={() => handleMarkPaid(c)} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={() => { setPayingCategoryId(c.id); setPayAmount('') }} className="shrink-0">
                      Marcar como pagado
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

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

      <Modal open={recurringModalOpen} onClose={() => setRecurringModalOpen(false)} title="Confirmar gastos recurrentes">
        <div className="space-y-4">
          {confirmItems.map((item) => (
            <div key={item.templateId} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={!item.skip}
                    onChange={(e) => updateConfirmItem(item.templateId, { skip: !e.target.checked })}
                  />
                  <span className="font-medium">{item.description || item.categoryName}</span>
                  <span className="text-xs text-ink-faint">({item.categoryName})</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={item.skip}
                  value={item.amount}
                  onChange={(e) => updateConfirmItem(item.templateId, { amount: e.target.value })}
                  className="max-w-[120px] text-right tabular"
                />
              </div>
              {item.changed && (
                <div className="flex items-start gap-1.5 text-xs text-warn">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>El mes pasado pagaste {formatMoney(item.lastActual)}, distinto al monto habitual de la plantilla.</span>
                </div>
              )}
            </div>
          ))}
          <Button
            onClick={handleConfirmRecurring}
            loading={confirmingRecurring}
            disabled={confirmItems.every((i) => i.skip)}
            className="w-full"
          >
            Confirmar seleccionados
          </Button>
        </div>
      </Modal>
    </motion.div>
  )
}
