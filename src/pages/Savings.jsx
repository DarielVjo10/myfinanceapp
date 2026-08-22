import { useEffect, useState } from 'react'
import { Plus, PiggyBank, AlertTriangle, Pencil, X, Check, TrendingUp, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import {
  listGoalsWithBalances,
  createGoal,
  updateGoal,
  deactivateGoal,
  addContribution,
  contributionsForPeriod,
} from '../services/savings'
import { listAccounts, computeAccountBalance } from '../services/accounts'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { GoalRing } from '../components/dashboard/GoalRing'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { formatMoney } from '../utils/format'
import { projectGoalCompletion } from '../utils/finance'

const CURRENCIES = ['DOP', 'USD']
const STATUS_LABEL = { ahead: 'Adelantado', on_time: 'A tiempo', behind: 'Atrasado' }
const STATUS_CLASS = {
  ahead: 'bg-emerald-500/10 text-emerald-500',
  on_time: 'bg-info/10 text-info',
  behind: 'bg-alert/10 text-alert',
}

export default function Savings() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [goals, setGoals] = useState(null)
  const [contributions, setContributions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ goalId: '', amount: '', note: '', accountId: '', contributionType: 'planned' })
  const [balanceWarning, setBalanceWarning] = useState(null)

  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', targetDate: '', plannedMonthlyContribution: '', currency: 'DOP' })
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [editGoalForm, setEditGoalForm] = useState({ name: '', targetAmount: '', targetDate: '', plannedMonthlyContribution: '', currency: 'DOP' })
  const [savingGoal, setSavingGoal] = useState(false)

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
      contributionType: form.contributionType,
    })
    setSaving(false)
    setModalOpen(false)
    setBalanceWarning(null)
    setForm({ goalId: form.goalId, amount: '', note: '', accountId: '', contributionType: 'planned' })
    load()
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!newGoal.name.trim()) return
    setSavingGoal(true)
    await createGoal(user.id, {
      name: newGoal.name,
      targetAmount: newGoal.targetAmount ? Number(newGoal.targetAmount) : null,
      targetDate: newGoal.targetDate || null,
      plannedMonthlyContribution: newGoal.plannedMonthlyContribution ? Number(newGoal.plannedMonthlyContribution) : null,
      currency: newGoal.currency,
    })
    setSavingGoal(false)
    setNewGoalModalOpen(false)
    setNewGoal({ name: '', targetAmount: '', targetDate: '', plannedMonthlyContribution: '', currency: 'DOP' })
    load()
  }

  const startEditGoal = (goal) => {
    setEditingGoalId(goal.id)
    setEditGoalForm({
      name: goal.name,
      targetAmount: goal.target_amount ?? '',
      targetDate: goal.target_date ?? '',
      plannedMonthlyContribution: goal.planned_monthly_contribution ?? '',
      currency: goal.currency || 'DOP',
    })
  }
  const cancelEditGoal = () => setEditingGoalId(null)
  const saveEditGoal = async (goalId) => {
    if (!editGoalForm.name.trim()) return
    await updateGoal(goalId, {
      name: editGoalForm.name,
      target_amount: editGoalForm.targetAmount ? Number(editGoalForm.targetAmount) : null,
      target_date: editGoalForm.targetDate || null,
      planned_monthly_contribution: editGoalForm.plannedMonthlyContribution ? Number(editGoalForm.plannedMonthlyContribution) : null,
      currency: editGoalForm.currency,
    })
    setEditingGoalId(null)
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setNewGoalModalOpen(true)}>
            <Plus size={16} /> Nueva meta
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nuevo aporte
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon={PiggyBank} title="Sin metas aún" description="Crea tu primera meta de ahorro arriba." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            if (editingGoalId === goal.id) {
              return (
                <Card key={goal.id} className="space-y-2.5">
                  <Input placeholder="Nombre" value={editGoalForm.name} onChange={(e) => setEditGoalForm({ ...editGoalForm, name: e.target.value })} />
                  <Field label="Monto objetivo">
                    <Input type="number" step="0.01" value={editGoalForm.targetAmount} onChange={(e) => setEditGoalForm({ ...editGoalForm, targetAmount: e.target.value })} />
                  </Field>
                  <Field label="Fecha objetivo (opcional)">
                    <Input type="date" value={editGoalForm.targetDate} onChange={(e) => setEditGoalForm({ ...editGoalForm, targetDate: e.target.value })} />
                  </Field>
                  <Field label="Aporte mensual planificado (opcional)">
                    <Input type="number" step="0.01" value={editGoalForm.plannedMonthlyContribution} onChange={(e) => setEditGoalForm({ ...editGoalForm, plannedMonthlyContribution: e.target.value })} />
                  </Field>
                  <Field label="Moneda">
                    <Select value={editGoalForm.currency} onChange={(e) => setEditGoalForm({ ...editGoalForm, currency: e.target.value })}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => saveEditGoal(goal.id)} className="shrink-0"><Check size={16} /></Button>
                    <Button variant="secondary" onClick={cancelEditGoal} className="shrink-0"><X size={16} /></Button>
                  </div>
                </Card>
              )
            }

            const projection = projectGoalCompletion({
              currentAmount: goal.balance,
              targetAmount: Number(goal.target_amount || 0),
              monthlyContribution: Number(goal.planned_monthly_contribution || 0),
              targetDate: goal.target_date,
            })

            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEditGoal(goal)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={async () => { await deactivateGoal(goal.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                  {projection?.status && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[projection.status]}`}>
                      {STATUS_LABEL[projection.status]}
                    </span>
                  )}
                </div>

                <div className="flex justify-center mb-3">
                  <GoalRing label={goal.name} current={goal.balance} target={goal.target_amount || goal.balance || 1} />
                </div>

                <div className="space-y-1 text-xs text-ink-faint text-center">
                  {goal.target_date && <p>Fecha objetivo: {goal.target_date}</p>}
                  {goal.planned_monthly_contribution > 0 && (
                    <p>Ritmo actual: {formatMoney(goal.planned_monthly_contribution)}/mes</p>
                  )}
                  {projection?.monthsToComplete != null && projection.monthsToComplete > 0 && (
                    <p>
                      A este ritmo, la cumples en {projection.monthsToComplete} {projection.monthsToComplete === 1 ? 'mes' : 'meses'}
                    </p>
                  )}
                  {projection?.status === 'behind' && projection.requiredMonthlyContribution != null && (
                    <p className="text-alert">
                      Para llegar el {goal.target_date} necesitas aportar {formatMoney(projection.requiredMonthlyContribution)}/mes
                      {goal.planned_monthly_contribution ? ` en vez de ${formatMoney(goal.planned_monthly_contribution)}/mes` : ''}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

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
                <div className="flex items-center gap-2">
                  {c.contribution_type === 'extraordinary' ? (
                    <TrendingUp size={14} className="text-info shrink-0" />
                  ) : (
                    <Clock size={14} className="text-ink-faint shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {c.savings_goals?.name}
                      {c.contribution_type === 'extraordinary' && (
                        <span className="ml-1.5 text-[10px] font-medium text-info bg-info/10 px-1.5 py-0.5 rounded-full align-middle">Extra</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint">{c.contribution_date}{c.note ? ` · ${c.note}` : ''}</p>
                  </div>
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
          <Field label="Tipo de aporte">
            <Select value={form.contributionType} onChange={(e) => setForm({ ...form, contributionType: e.target.value })}>
              <option value="planned">Planificado</option>
              <option value="extraordinary">Extraordinario</option>
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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

      <Modal open={newGoalModalOpen} onClose={() => setNewGoalModalOpen(false)} title="Nueva meta de ahorro">
        <form onSubmit={handleAddGoal} className="space-y-4">
          <Field label="Nombre">
            <Input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} required />
          </Field>
          <Field label="Monto objetivo (opcional)">
            <Input type="number" step="0.01" value={newGoal.targetAmount} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })} />
          </Field>
          <Field label="Fecha objetivo (opcional)">
            <Input type="date" value={newGoal.targetDate} onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })} />
          </Field>
          <Field label="Aporte mensual planificado (opcional)">
            <Input type="number" step="0.01" value={newGoal.plannedMonthlyContribution} onChange={(e) => setNewGoal({ ...newGoal, plannedMonthlyContribution: e.target.value })} />
          </Field>
          <Field label="Moneda">
            <Select value={newGoal.currency} onChange={(e) => setNewGoal({ ...newGoal, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Button type="submit" loading={savingGoal} className="w-full">Crear meta</Button>
        </form>
      </Modal>
    </div>
  )
}
