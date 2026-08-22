import { useEffect, useState } from 'react'
import { Plus, PiggyBank } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listGoalsWithBalances, addContribution, contributionsForPeriod } from '../services/savings'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { GoalRing } from '../components/dashboard/GoalRing'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { formatMoney } from '../utils/format'

export default function Savings() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [goals, setGoals] = useState(null)
  const [contributions, setContributions] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ goalId: '', amount: '', note: '' })

  const load = async () => {
    const [g, c] = await Promise.all([
      listGoalsWithBalances(user.id),
      contributionsForPeriod(user.id, currentPeriod.id),
    ])
    setGoals(g)
    setContributions(c)
    setForm((f) => ({ ...f, goalId: f.goalId || g[0]?.id || '' }))
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addContribution(user.id, form.goalId, currentPeriod.id, {
      amount: Number(form.amount),
      note: form.note,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ goalId: form.goalId, amount: '', note: '' })
    load()
  }

  if (goals === null) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-xl text-ink">Ahorros</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo aporte
        </Button>
      </div>

      <Card>
        <CardHeader title="Metas" subtitle="Balance acumulado histórico" />
        {goals.length === 0 ? (
          <EmptyState icon={PiggyBank} title="Sin metas aún" description="Crea metas de ahorro en Ajustes." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-2">
            {goals.map((goal) => (
              <GoalRing key={goal.id} label={goal.name} current={goal.balance} target={goal.target_amount || goal.balance || 1} />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-0">
          <CardHeader title="Aportes de este mes" />
        </div>
        {contributions.length === 0 ? (
          <p className="text-ink-faint text-sm px-5 pb-5">Sin aportes registrados este mes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contributions.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink">{c.savings_goals?.name}</p>
                  <p className="text-xs text-ink-faint">{c.contribution_date}{c.note ? ` · ${c.note}` : ''}</p>
                </div>
                <span className="tabular font-medium text-emerald-500 text-sm">+{formatMoney(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo aporte">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Meta">
            <Select value={form.goalId} onChange={(e) => setForm({ ...form, goalId: e.target.value })} required>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Nota (opcional)">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Button type="submit" loading={saving} className="w-full">Guardar aporte</Button>
        </form>
      </Modal>
    </div>
  )
}
