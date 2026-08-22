import { useEffect, useState } from 'react'
import { Plus, PiggyBank, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listGoalsWithBalances, addContribution, contributionsForPeriod } from '../services/savings'
import { listAccounts, computeAccountBalance } from '../services/accounts'
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
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ goalId: '', amount: '', note: '', accountId: '' })
  const [balanceWarning, setBalanceWarning] = useState(null)

  const load = async () => {
    const [g, c, accs] = await Promise.all([
      listGoalsWithBalances(user.id),
      contributionsForPeriod(user.id, currentPeriod.id),
      listAccounts(user.id),
    ])
    setGoals(g)
    setContributions(c)
    setAccounts(accs)
    setForm((f) => ({ ...f, goalId: f.goalId || g[0]?.id || '' }))
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

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
          ? `Esta cuenta quedaría en ${formatMoney(projected)} (balance negativo) si guardas este aporte.`
          : null
      )
    }, 400)
    return () => { active = false; clearTimeout(timer) }
  }, [form.accountId, form.amount, user, currentPeriod])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await addContribution(user.id, form.goalId, currentPeriod.id, {
      amount: Number(form.amount),
      note: form.note,
      accountId: form.accountId || null,
    })
    setSaving(false)
    setModalOpen(false)
    setBalanceWarning(null)
    setForm({ goalId: form.goalId, amount: '', note: '', accountId: '' })
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
          <Field label="¿De qué cuenta sale este ahorro? (opcional)">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Sin especificar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          {balanceWarning && (
            <div className="flex items-start gap-2 text-xs text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{balanceWarning}</span>
            </div>
          )}
          <Button type="submit" loading={saving} className="w-full">Guardar aporte</Button>
        </form>
      </Modal>
    </div>
  )
}
