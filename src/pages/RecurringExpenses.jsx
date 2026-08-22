import { useEffect, useState } from 'react'
import { Repeat, Plus, Trash2, Pencil, X, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { listCategories } from '../services/categories'
import { listAccounts } from '../services/accounts'
import {
  listRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deactivateRecurringTemplate,
} from '../services/recurring'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { formatMoney } from '../utils/format'

export default function RecurringExpenses() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState(null)
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [newTemplate, setNewTemplate] = useState({ categoryId: '', accountId: '', amount: '', description: '', recurringDay: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ categoryId: '', accountId: '', amount: '', description: '', recurringDay: '' })

  const load = async () => {
    const [tpls, cats, accs] = await Promise.all([
      listRecurringTemplates(user.id),
      listCategories(user.id),
      listAccounts(user.id),
    ])
    setTemplates(tpls)
    setCategories(cats)
    setAccounts(accs)
    setNewTemplate((t) => ({ ...t, categoryId: t.categoryId || cats[0]?.id || '' }))
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newTemplate.categoryId || !newTemplate.amount) return
    await createRecurringTemplate(user.id, {
      categoryId: newTemplate.categoryId,
      accountId: newTemplate.accountId || null,
      amount: Number(newTemplate.amount),
      description: newTemplate.description,
      recurringDay: newTemplate.recurringDay ? Number(newTemplate.recurringDay) : null,
    })
    setNewTemplate({ categoryId: newTemplate.categoryId, accountId: '', amount: '', description: '', recurringDay: '' })
    load()
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      categoryId: t.category_id,
      accountId: t.account_id || '',
      amount: t.amount,
      description: t.description || '',
      recurringDay: t.recurring_day ?? '',
    })
  }
  const cancelEdit = () => setEditingId(null)
  const saveEdit = async (id) => {
    await updateRecurringTemplate(id, {
      category_id: editForm.categoryId,
      account_id: editForm.accountId || null,
      amount: Number(editForm.amount),
      description: editForm.description,
      recurring_day: editForm.recurringDay ? Number(editForm.recurringDay) : null,
    })
    setEditingId(null)
    load()
  }

  if (templates === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-semibold text-xl text-ink">Gastos Recurrentes</h1>
        <p className="text-ink-muted text-sm">Suscripciones y pagos fijos que se repiten cada mes</p>
      </div>

      <Card>
        {templates.length === 0 ? (
          <EmptyState icon={Repeat} title="Sin gastos recurrentes" description="Agrega tu primera plantilla abajo — cada mes te avisamos en el Panel para confirmarla." />
        ) : (
          <ul className="divide-y divide-border mb-4">
            {templates.map((t) => {
              if (editingId === t.id) {
                return (
                  <li key={t.id} className="py-3 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Select value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                      <Select value={editForm.accountId} onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}>
                        <option value="">Sin cuenta</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
                      <Input placeholder="Descripción" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="Monto" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Input type="number" min="1" max="31" placeholder="Día del mes" value={editForm.recurringDay} onChange={(e) => setEditForm({ ...editForm, recurringDay: e.target.value })} className="max-w-[140px]" />
                      <button onClick={() => saveEdit(t.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} className="text-ink-faint hover:text-ink transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </li>
                )
              }
              return (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Repeat size={14} className="text-ink-faint shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-ink">{t.description || t.expense_categories?.name}</p>
                      <p className="text-xs text-ink-faint">
                        {t.expense_categories?.name}
                        {t.recurring_day ? ` · día ${t.recurring_day}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-sm text-ink-muted">{formatMoney(t.amount)}</span>
                    <button onClick={() => startEdit(t)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={async () => { await deactivateRecurringTemplate(t.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <CardHeader title="Nueva plantilla" />
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Select value={newTemplate.categoryId} onChange={(e) => setNewTemplate({ ...newTemplate, categoryId: e.target.value })} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={newTemplate.accountId} onChange={(e) => setNewTemplate({ ...newTemplate, accountId: e.target.value })}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input placeholder="Descripción (Netflix, alquiler…)" value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Monto" value={newTemplate.amount} onChange={(e) => setNewTemplate({ ...newTemplate, amount: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" min="1" max="31" placeholder="Día" value={newTemplate.recurringDay} onChange={(e) => setNewTemplate({ ...newTemplate, recurringDay: e.target.value })} />
            <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
