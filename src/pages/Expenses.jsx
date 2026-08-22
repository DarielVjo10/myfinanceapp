import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listExpenses, createExpense, deleteExpense } from '../services/expenses'
import { listCategories } from '../services/categories'
import { listAccounts } from '../services/accounts'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { formatMoney } from '../utils/format'

export default function Expenses() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [expenses, setExpenses] = useState(null)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ categoryId: '', accountId: '', amount: '', description: '' })

  const load = async () => {
    const [exp, cats, accs] = await Promise.all([
      listExpenses(user.id, currentPeriod.id),
      listCategories(user.id),
      listAccounts(user.id),
    ])
    setExpenses(exp)
    setCategories(cats)
    setAccounts(accs)
    setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?.id || '' }))
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await createExpense(user.id, currentPeriod.id, {
      categoryId: form.categoryId,
      accountId: form.accountId || null,
      amount: Number(form.amount),
      description: form.description,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ categoryId: categories[0]?.id || '', accountId: '', amount: '', description: '' })
    load()
  }

  const handleDelete = async (id) => {
    await deleteExpense(id)
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
                  <p className="text-sm font-medium text-ink">{exp.expense_categories?.name}</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo gasto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Categoría">
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Cuenta">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Sin especificar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Descripción (opcional)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Button type="submit" loading={saving} className="w-full">Guardar</Button>
        </form>
      </Modal>
    </div>
  )
}
