import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingDown, AlertTriangle, Tags, Pencil, X, Check, Repeat } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listExpenses, createExpense, deleteExpense, getCategoryHistoricalAverage } from '../services/expenses'
import { autoGenerateRecurringExpenses } from '../services/recurring'
import {
  listCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  getBudgetsForPeriod,
  setBudget,
  getBudgetUsageForPeriod,
} from '../services/categories'
import { listAccounts, computeAccountBalance } from '../services/accounts'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton, BudgetBadge } from '../components/ui/Feedback'
import { formatMoney } from '../utils/format'

export default function Expenses() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const [expenses, setExpenses] = useState(null)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ categoryId: '', accountId: '', amount: '', description: '' })
  const [balanceWarning, setBalanceWarning] = useState(null)
  const [budgetUsage, setBudgetUsage] = useState([])
  const [anomalyAverage, setAnomalyAverage] = useState(null)
  const [anomalyConfirmed, setAnomalyConfirmed] = useState(false)
  const [budgetByCategory, setBudgetByCategory] = useState({})
  const [newCategory, setNewCategory] = useState({ name: '', classification: 'wants' })
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', classification: 'wants' })

  const load = async () => {
    // best-effort en el cliente: genera automáticamente los gastos
    // recurrentes cuyo día ya llegó este período (ver services/recurring.js)
    await autoGenerateRecurringExpenses(user.id, currentPeriod).catch(() => [])

    const [exp, cats, accs, usage, budgets] = await Promise.all([
      listExpenses(user.id, currentPeriod.id),
      listCategories(user.id),
      listAccounts(user.id),
      getBudgetUsageForPeriod(user.id, currentPeriod.id),
      getBudgetsForPeriod(user.id, currentPeriod.id),
    ])
    setExpenses(exp)
    setCategories(cats)
    setAccounts(accs)
    setBudgetUsage(usage)
    setBudgetByCategory(Object.fromEntries(budgets.map((b) => [b.category_id, b.budgeted_amount])))
    setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?.id || '' }))
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)

  useEffect(() => {
    if (!form.accountId || !form.amount || !user || !currentPeriod) {
      setBalanceWarning(null)
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      const { balance } = await computeAccountBalance(user.id, form.accountId, currentPeriod.id)
      if (!active) return
      const projected = balance - Number(form.amount)
      setBalanceWarning(
        projected < 0
          ? `Esta cuenta quedaría en ${formatMoney(projected)} (balance negativo) si guardas este gasto.`
          : null
      )
    }, 400)
    return () => { active = false; clearTimeout(timer) }
  }, [form.accountId, form.amount, user, currentPeriod])

  const usageForSelectedCategory = budgetUsage.find((u) => u.categoryId === form.categoryId)
  const projectedBudgetPct = usageForSelectedCategory
    ? ((usageForSelectedCategory.spent + Number(form.amount || 0)) / usageForSelectedCategory.budgeted) * 100
    : null

  useEffect(() => {
    setAnomalyConfirmed(false)
    if (!form.categoryId || !currentPeriod || allPeriods.length === 0) {
      setAnomalyAverage(null)
      return
    }
    let active = true
    const priorPeriodIds = allPeriods.filter((p) => p.id !== currentPeriod.id).map((p) => p.id)
    getCategoryHistoricalAverage(user.id, form.categoryId, priorPeriodIds).then((avg) => {
      if (active) setAnomalyAverage(avg)
    })
    return () => { active = false }
  }, [form.categoryId, currentPeriod, allPeriods, user])

  const isAnomaly = anomalyAverage !== null && Number(form.amount || 0) >= anomalyAverage * 2

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAnomaly && !anomalyConfirmed) {
      setAnomalyConfirmed(true)
      return
    }
    setSaving(true)
    await createExpense(user.id, currentPeriod.id, {
      categoryId: form.categoryId,
      accountId: form.accountId || null,
      amount: Number(form.amount),
      description: form.description,
    })
    setSaving(false)
    setModalOpen(false)
    setBalanceWarning(null)
    setAnomalyConfirmed(false)
    setForm({ categoryId: categories[0]?.id || '', accountId: '', amount: '', description: '' })
    load()
  }

  const handleDelete = async (id) => {
    await deleteExpense(id, user.id)
    load()
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    await createCategory(user.id, newCategory)
    setNewCategory({ name: '', classification: 'wants' })
    load()
  }

  const startEditCategory = (c) => {
    setEditingCategoryId(c.id)
    setEditCategoryForm({ name: c.name, classification: c.classification })
  }
  const cancelEditCategory = () => setEditingCategoryId(null)
  const saveEditCategory = async (categoryId) => {
    if (!editCategoryForm.name.trim()) return
    await updateCategory(categoryId, { name: editCategoryForm.name, classification: editCategoryForm.classification })
    setEditingCategoryId(null)
    load()
  }

  const handleBudgetChange = (categoryId, value) => {
    setBudgetByCategory((b) => ({ ...b, [categoryId]: value }))
  }
  const handleBudgetBlur = async (categoryId, value) => {
    if (value === '' || value === undefined) return
    await setBudget(user.id, categoryId, currentPeriod.id, Number(value))
    load()
  }

  const handleDueDayBlur = async (categoryId, value) => {
    await updateCategory(categoryId, { due_day: value === '' ? null : Number(value) })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl text-ink">Gastos</h1>
          <p className="text-ink-muted text-sm tabular">Total del mes: {formatMoney(total)}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo gasto
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {expenses === null ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState icon={TrendingDown} title="Sin gastos este mes" description="Registra tu primer gasto para este período." />
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((exp) => (
              <li key={exp.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                    {exp.expense_categories?.name}
                    {exp.template_id && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-info bg-info/10 px-1.5 py-0.5 rounded-full">
                        <Repeat size={10} /> Recurrente
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {exp.accounts?.name || 'Sin cuenta'} · {exp.expense_date}
                    {exp.description ? ` · ${exp.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular font-medium text-alert text-sm">{formatMoney(exp.amount)}</span>
                  <button onClick={() => handleDelete(exp.id)} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Categorías" subtitle="Clasificación, presupuesto y fecha límite de este mes" icon={Tags} />
        <ul className="divide-y divide-border mb-4">
          {categories.map((c) => {
            if (editingCategoryId === c.id) {
              return (
                <li key={c.id} className="flex items-center gap-2 py-2.5">
                  <Input
                    value={editCategoryForm.name}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={editCategoryForm.classification}
                    onChange={(e) => setEditCategoryForm({ ...editCategoryForm, classification: e.target.value })}
                    className="max-w-[130px]"
                  >
                    <option value="needs">Necesidad</option>
                    <option value="wants">Deseo</option>
                    <option value="savings">Ahorro</option>
                  </Select>
                  <button onClick={() => saveEditCategory(c.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0">
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEditCategory} className="text-ink-faint hover:text-ink transition-colors shrink-0">
                    <X size={16} />
                  </button>
                </li>
              )
            }
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
                  className="max-w-[110px] text-right tabular shrink-0"
                  value={budgetByCategory[c.id] ?? ''}
                  onChange={(e) => handleBudgetChange(c.id, e.target.value)}
                  onBlur={(e) => handleBudgetBlur(c.id, e.target.value)}
                />
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Día venc."
                  className="max-w-[85px] text-right tabular shrink-0"
                  defaultValue={c.due_day ?? ''}
                  onBlur={(e) => handleDueDayBlur(c.id, e.target.value)}
                />
                <button onClick={() => startEditCategory(c)} className="text-ink-faint hover:text-emerald-500 transition-colors shrink-0">
                  <Pencil size={15} />
                </button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo gasto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Categoría">
            <Select value={form.categoryId} onChange={(e) => { setForm({ ...form, categoryId: e.target.value }); setAnomalyConfirmed(false) }} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          {projectedBudgetPct !== null && (
            <BudgetBadge pct={projectedBudgetPct} />
          )}
          <Field label="Cuenta">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Sin especificar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => { setForm({ ...form, amount: e.target.value }); setAnomalyConfirmed(false) }}
            />
          </Field>
          <Field label="Descripción (opcional)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {balanceWarning && (
            <div className="flex items-start gap-2 text-xs text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{balanceWarning}</span>
            </div>
          )}
          {isAnomaly && (
            <div className="flex items-start gap-2 text-xs text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Este gasto es más alto de lo usual en {categories.find((c) => c.id === form.categoryId)?.name}
                {' '}(promedio: {formatMoney(anomalyAverage)}), ¿confirmar de todas formas?
              </span>
            </div>
          )}
          <Button type="submit" loading={saving} className="w-full">
            {isAnomaly && !anomalyConfirmed ? 'Confirmar de todas formas' : 'Guardar'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
