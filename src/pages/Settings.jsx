import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, Tags, Landmark, PiggyBank, CheckCircle2, Pencil, X, Check, Repeat, DollarSign, Download, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listCategories, createCategory, updateCategory, deactivateCategory, getBudgetsForPeriod, setBudget, getBudgetUsageForPeriod } from '../services/categories'
import { listAccounts, createAccount, updateAccount, deactivateAccount } from '../services/accounts'
import { listGoals, createGoal, updateGoal, deactivateGoal } from '../services/savings'
import { getFinancialSettings, updateFinancialSettings } from '../services/settings'
import { cloneMonthConfig, getOrCreatePeriod } from '../services/periods'
import { listRecurringTemplates, createRecurringTemplate, deactivateRecurringTemplate } from '../services/recurring'
import { listExchangeRates, createExchangeRate, deleteExchangeRate } from '../services/exchangeRates'
import { exportFullHistory, exportAnnualReportPDF } from '../services/export'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
import { Skeleton, BudgetBadge } from '../components/ui/Feedback'
import { monthLabel, formatMoney } from '../utils/format'

const CURRENCIES = ['DOP', 'USD']

const SPLIT_PRESETS = [
  { label: '50 / 30 / 20', needs: 50, wants: 30, savings: 20 },
  { label: '70 / 20 / 10', needs: 70, wants: 20, savings: 10 },
  { label: '60 / 20 / 20', needs: 60, wants: 20, savings: 20 },
  { label: '80 / 10 / 10', needs: 80, wants: 10, savings: 10 },
  { label: '40 / 30 / 30', needs: 40, wants: 30, savings: 30 },
]

export default function Settings() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods, switchToPeriod, refreshPeriods } = usePeriod()

  const [categories, setCategories] = useState(null)
  const [accounts, setAccounts] = useState(null)
  const [goals, setGoals] = useState(null)
  const [financial, setFinancial] = useState(null)
  const [recurring, setRecurring] = useState(null)
  const [budgetUsage, setBudgetUsage] = useState([])
  const [budgetByCategory, setBudgetByCategory] = useState({})
  const [exchangeRates, setExchangeRates] = useState(null)

  const [newCategory, setNewCategory] = useState({ name: '', classification: 'wants' })
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', currency: 'DOP' })
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', currency: 'DOP' })
  const [newRecurring, setNewRecurring] = useState({ categoryId: '', amount: '', description: '', recurringDay: '' })
  const [newRate, setNewRate] = useState({ fromCurrency: 'USD', rate: '', date: '' })
  const [split, setSplit] = useState({ needs: 50, wants: 30, savings: 20 })
  const [savingSplit, setSavingSplit] = useState(false)
  const [cloneStatus, setCloneStatus] = useState('idle') // idle | working | done
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editAccountForm, setEditAccountForm] = useState({ name: '', type: 'bank', currency: 'DOP' })
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [editGoalForm, setEditGoalForm] = useState({ name: '', targetAmount: '' })

  const load = async () => {
    const [cats, accs, gls, fin, rec, usage, budgets, rates] = await Promise.all([
      listCategories(user.id),
      listAccounts(user.id),
      listGoals(user.id),
      getFinancialSettings(user.id),
      listRecurringTemplates(user.id),
      currentPeriod ? getBudgetUsageForPeriod(user.id, currentPeriod.id) : Promise.resolve([]),
      currentPeriod ? getBudgetsForPeriod(user.id, currentPeriod.id) : Promise.resolve([]),
      listExchangeRates(user.id),
    ])
    setCategories(cats)
    setAccounts(accs)
    setGoals(gls)
    setFinancial(fin)
    setRecurring(rec)
    setBudgetUsage(usage)
    setExchangeRates(rates)
    setBudgetByCategory(Object.fromEntries(budgets.map((b) => [b.category_id, b.budgeted_amount])))
    setSplit({ needs: fin.needs_pct, wants: fin.wants_pct, savings: fin.savings_pct })
    setNewRecurring((r) => ({ ...r, categoryId: r.categoryId || cats[0]?.id || '' }))
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    await createCategory(user.id, newCategory)
    setNewCategory({ name: '', classification: 'wants' })
    load()
  }

  const handleBudgetChange = (categoryId, value) => {
    setBudgetByCategory((b) => ({ ...b, [categoryId]: value }))
  }
  const handleBudgetBlur = async (categoryId, value) => {
    if (value === '' || value === undefined || !currentPeriod) return
    await setBudget(user.id, categoryId, currentPeriod.id, Number(value))
    load()
  }

  const handleDueDayBlur = async (categoryId, value) => {
    await updateCategory(categoryId, { due_day: value === '' ? null : Number(value) })
    load()
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    if (!newAccount.name.trim()) return
    await createAccount(user.id, newAccount)
    setNewAccount({ name: '', type: 'bank', currency: 'DOP' })
    load()
  }

  const handleAddRate = async (e) => {
    e.preventDefault()
    if (!newRate.fromCurrency || !newRate.rate) return
    await createExchangeRate(user.id, {
      fromCurrency: newRate.fromCurrency,
      rate: Number(newRate.rate),
      date: newRate.date || undefined,
    })
    setNewRate({ fromCurrency: 'USD', rate: '', date: '' })
    load()
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!newGoal.name.trim()) return
    await createGoal(user.id, {
      name: newGoal.name,
      targetAmount: newGoal.targetAmount ? Number(newGoal.targetAmount) : null,
      currency: newGoal.currency,
    })
    setNewGoal({ name: '', targetAmount: '', currency: 'DOP' })
    load()
  }

  const handleAddRecurring = async (e) => {
    e.preventDefault()
    if (!newRecurring.categoryId || !newRecurring.amount) return
    await createRecurringTemplate(user.id, {
      categoryId: newRecurring.categoryId,
      amount: Number(newRecurring.amount),
      description: newRecurring.description,
      recurringDay: newRecurring.recurringDay ? Number(newRecurring.recurringDay) : null,
    })
    setNewRecurring({ categoryId: newRecurring.categoryId, amount: '', description: '', recurringDay: '' })
    load()
  }

  const startEditAccount = (account) => {
    setEditingAccountId(account.id)
    setEditAccountForm({ name: account.name, type: account.type, currency: account.currency || 'DOP' })
  }
  const cancelEditAccount = () => setEditingAccountId(null)
  const saveEditAccount = async (accountId) => {
    if (!editAccountForm.name.trim()) return
    await updateAccount(accountId, editAccountForm)
    setEditingAccountId(null)
    load()
  }

  const startEditGoal = (goal) => {
    setEditingGoalId(goal.id)
    setEditGoalForm({ name: goal.name, targetAmount: goal.target_amount ?? '' })
  }
  const cancelEditGoal = () => setEditingGoalId(null)
  const saveEditGoal = async (goalId) => {
    if (!editGoalForm.name.trim()) return
    await updateGoal(goalId, {
      name: editGoalForm.name,
      target_amount: editGoalForm.targetAmount ? Number(editGoalForm.targetAmount) : null,
    })
    setEditingGoalId(null)
    load()
  }

  const handleSaveSplit = async (e) => {
    e.preventDefault()
    const total = Number(split.needs) + Number(split.wants) + Number(split.savings)
    if (total !== 100) return
    setSavingSplit(true)
    await updateFinancialSettings(user.id, {
      needsPct: Number(split.needs),
      wantsPct: Number(split.wants),
      savingsPct: Number(split.savings),
    })
    setSavingSplit(false)
  }

  const handleCloneMonth = async () => {
    if (!currentPeriod) return
    setCloneStatus('working')
    let { year, month } = currentPeriod
    month += 1
    if (month > 12) { month = 1; year += 1 }
    try {
      const nextPeriod = await getOrCreatePeriod(user.id, year, month)
      await cloneMonthConfig(user.id, currentPeriod.id, nextPeriod.id)
      await refreshPeriods()
      await switchToPeriod(year, month)
      setCloneStatus('done')
      setTimeout(() => setCloneStatus('idle'), 2500)
    } catch (err) {
      setCloneStatus('idle')
      throw err
    }
  }

  const handleExportCSV = async () => {
    setExportingCSV(true)
    try {
      await exportFullHistory(user.id)
    } finally {
      setExportingCSV(false)
    }
  }

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      await exportAnnualReportPDF(user.id, Number(reportYear))
    } finally {
      setExportingPDF(false)
    }
  }

  const splitTotal = Number(split.needs) + Number(split.wants) + Number(split.savings)

  if (!categories || !accounts || !goals || !financial || !recurring || !exchangeRates) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display font-semibold text-xl text-ink">Ajustes</h1>

      <Card>
        <CardHeader
          title="Clonar mes"
          subtitle={
            currentPeriod
              ? `Copia solo configuración (categorías, metas, cuentas, presupuestos, distribución) de ${monthLabel(currentPeriod.year, currentPeriod.month)} hacia el siguiente mes. Nunca copia movimientos.`
              : ''
          }
        />
        <Button onClick={handleCloneMonth} loading={cloneStatus === 'working'} variant="secondary">
          {cloneStatus === 'done' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {cloneStatus === 'done' ? 'Configuración copiada' : 'Clonar hacia el próximo mes'}
        </Button>
      </Card>

      <Card>
        <CardHeader title="Objetivo de distribución" subtitle="Elige un preset o personaliza los porcentajes — debe sumar 100%" />
        <div className="flex flex-wrap gap-2 mb-4">
          {SPLIT_PRESETS.map((preset) => {
            const active = Number(split.needs) === preset.needs && Number(split.wants) === preset.wants && Number(split.savings) === preset.savings
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSplit({ needs: preset.needs, wants: preset.wants, savings: preset.savings })}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                    : 'border-border text-ink-muted hover:border-emerald-500/40 hover:text-ink'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <form onSubmit={handleSaveSplit} className="grid grid-cols-3 gap-3 items-end">
          <Field label="Necesidades %">
            <Input type="number" value={split.needs} onChange={(e) => setSplit({ ...split, needs: e.target.value })} />
          </Field>
          <Field label="Deseos %">
            <Input type="number" value={split.wants} onChange={(e) => setSplit({ ...split, wants: e.target.value })} />
          </Field>
          <Field label="Ahorro %">
            <Input type="number" value={split.savings} onChange={(e) => setSplit({ ...split, savings: e.target.value })} />
          </Field>
          <div className="col-span-3 flex items-center justify-between">
            <span className={`text-xs ${splitTotal === 100 ? 'text-ink-faint' : 'text-alert'}`}>
              Total: {splitTotal}% {splitTotal !== 100 && '— debe ser 100%'}
            </span>
            <Button type="submit" loading={savingSplit} disabled={splitTotal !== 100} variant="secondary">
              Guardar
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Categorías de gastos" icon={Tags} />
        <ul className="divide-y divide-border mb-4">
          {categories.map((c) => {
            const usage = budgetUsage.find((u) => u.categoryId === c.id)
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Tags size={14} className="text-ink-faint shrink-0" />
                  <span className="text-sm text-ink truncate">{c.name}</span>
                  <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full capitalize shrink-0">{c.classification}</span>
                  {usage && <BudgetBadge pct={usage.pct} />}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Presupuesto"
                  className="max-w-[120px] text-right tabular shrink-0"
                  value={budgetByCategory[c.id] ?? ''}
                  onChange={(e) => handleBudgetChange(c.id, e.target.value)}
                  onBlur={(e) => handleBudgetBlur(c.id, e.target.value)}
                />
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Día venc."
                  className="max-w-[90px] text-right tabular shrink-0"
                  defaultValue={c.due_day ?? ''}
                  onBlur={(e) => handleDueDayBlur(c.id, e.target.value)}
                />
                <button onClick={async () => { await deactivateCategory(c.id); load() }} className="text-ink-faint hover:text-alert transition-colors shrink-0">
                  <Trash2 size={15} />
                </button>
              </li>
            )
          })}
        </ul>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <Input placeholder="Nueva categoría" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} />
          <Select value={newCategory.classification} onChange={(e) => setNewCategory({ ...newCategory, classification: e.target.value })} className="max-w-[130px]">
            <option value="needs">Necesidad</option>
            <option value="wants">Deseo</option>
            <option value="savings">Ahorro</option>
          </Select>
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Cuentas" icon={Landmark} />
        <ul className="divide-y divide-border mb-4">
          {accounts.map((a) =>
            editingAccountId === a.id ? (
              <li key={a.id} className="flex items-center gap-2 py-2.5">
                <Input
                  value={editAccountForm.name}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={editAccountForm.type}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, type: e.target.value })}
                  className="max-w-[130px]"
                >
                  <option value="bank">Banco</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </Select>
                <Select
                  value={editAccountForm.currency}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, currency: e.target.value })}
                  className="max-w-[90px]"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <button onClick={() => saveEditAccount(a.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={cancelEditAccount} className="text-ink-faint hover:text-ink transition-colors shrink-0">
                  <X size={16} />
                </button>
              </li>
            ) : (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <Landmark size={14} className="text-ink-faint" />
                  <span className="text-sm text-ink">{a.name}</span>
                  <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full capitalize">{a.type}</span>
                  <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full">{a.currency || 'DOP'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditAccount(a)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={async () => { await deactivateAccount(a.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
        <form onSubmit={handleAddAccount} className="flex gap-2">
          <Input placeholder="Nueva cuenta" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
          <Select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })} className="max-w-[130px]">
            <option value="bank">Banco</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
          <Select value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })} className="max-w-[90px]">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Tasas de cambio" subtitle="Actualízalas manualmente cuando quieras — se usa siempre la más reciente por moneda" icon={DollarSign} />
        <ul className="divide-y divide-border mb-4">
          {(exchangeRates ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-ink-faint" />
                <span className="text-sm text-ink">1 {r.from_currency} = {r.rate} {r.to_currency}</span>
                <span className="text-xs text-ink-faint">{r.date}</span>
              </div>
              <button onClick={async () => { await deleteExchangeRate(r.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {(exchangeRates ?? []).length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Sin tasas registradas — las cuentas en otra moneda no se podrán convertir hasta que agregues una.</li>
          )}
        </ul>
        <form onSubmit={handleAddRate} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={newRate.fromCurrency} onChange={(e) => setNewRate({ ...newRate, fromCurrency: e.target.value })}>
            {CURRENCIES.filter((c) => c !== 'DOP').map((c) => <option key={c} value={c}>{c} → DOP</option>)}
          </Select>
          <Input type="number" step="0.0001" placeholder="Tasa (ej. 62.5)" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} />
          <Input type="date" value={newRate.date} onChange={(e) => setNewRate({ ...newRate, date: e.target.value })} />
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Metas de ahorro" icon={PiggyBank} />
        <ul className="divide-y divide-border mb-4">
          {goals.map((g) =>
            editingGoalId === g.id ? (
              <li key={g.id} className="flex items-center gap-2 py-2.5">
                <Input
                  value={editGoalForm.name}
                  onChange={(e) => setEditGoalForm({ ...editGoalForm, name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Monto objetivo"
                  value={editGoalForm.targetAmount}
                  onChange={(e) => setEditGoalForm({ ...editGoalForm, targetAmount: e.target.value })}
                  className="max-w-[140px]"
                />
                <button onClick={() => saveEditGoal(g.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={cancelEditGoal} className="text-ink-faint hover:text-ink transition-colors shrink-0">
                  <X size={16} />
                </button>
              </li>
            ) : (
              <li key={g.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <PiggyBank size={14} className="text-ink-faint" />
                  <span className="text-sm text-ink">{g.name}</span>
                  {g.target_amount && <span className="text-xs text-ink-faint">meta: {g.target_amount}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditGoal(g)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={async () => { await deactivateGoal(g.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
        <form onSubmit={handleAddGoal} className="flex gap-2">
          <Input placeholder="Nueva meta" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} />
          <Input type="number" placeholder="Monto objetivo" value={newGoal.targetAmount} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })} className="max-w-[140px]" />
          <Select value={newGoal.currency} onChange={(e) => setNewGoal({ ...newGoal, currency: e.target.value })} className="max-w-[90px]">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Gastos recurrentes" subtitle="Suscripciones y pagos fijos que se repiten cada mes" icon={Repeat} />
        <ul className="divide-y divide-border mb-4">
          {recurring.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Repeat size={14} className="text-ink-faint" />
                <span className="text-sm text-ink">{r.description || r.expense_categories?.name}</span>
                <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full">{r.expense_categories?.name}</span>
                {r.recurring_day && <span className="text-xs text-ink-faint">día {r.recurring_day}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm text-ink-muted">{formatMoney(r.amount)}</span>
                <button onClick={async () => { await deactivateRecurringTemplate(r.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
          {recurring.length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Sin gastos recurrentes configurados.</li>
          )}
        </ul>
        <form onSubmit={handleAddRecurring} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={newRecurring.categoryId} onChange={(e) => setNewRecurring({ ...newRecurring, categoryId: e.target.value })} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input placeholder="Descripción (Netflix, alquiler…)" value={newRecurring.description} onChange={(e) => setNewRecurring({ ...newRecurring, description: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Monto" value={newRecurring.amount} onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" min="1" max="31" placeholder="Día" value={newRecurring.recurringDay} onChange={(e) => setNewRecurring({ ...newRecurring, recurringDay: e.target.value })} />
            <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Exportar / respaldar datos" subtitle="Descarga todo tu histórico, no solo el mes actual" icon={Download} />
        <div className="space-y-4">
          <div>
            <Button variant="secondary" onClick={handleExportCSV} loading={exportingCSV}>
              <Download size={16} /> Exportar historial completo (CSV)
            </Button>
            <p className="text-xs text-ink-faint mt-1.5">Descarga 4 archivos: ingresos, gastos, aportes de ahorro y balances de cuenta.</p>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Reporte anual PDF">
              <Input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="max-w-[120px]" />
            </Field>
            <Button variant="secondary" onClick={handleExportPDF} loading={exportingPDF}>
              <FileText size={16} /> Generar PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
