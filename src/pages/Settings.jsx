import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, Tags, Landmark, PiggyBank, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listCategories, createCategory, deactivateCategory } from '../services/categories'
import { listAccounts, createAccount, deactivateAccount } from '../services/accounts'
import { listGoals, createGoal, deactivateGoal } from '../services/savings'
import { getFinancialSettings, updateFinancialSettings } from '../services/settings'
import { cloneMonthConfig, getOrCreatePeriod } from '../services/periods'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Feedback'
import { monthLabel } from '../utils/format'

export default function Settings() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods, switchToPeriod, refreshPeriods } = usePeriod()

  const [categories, setCategories] = useState(null)
  const [accounts, setAccounts] = useState(null)
  const [goals, setGoals] = useState(null)
  const [financial, setFinancial] = useState(null)

  const [newCategory, setNewCategory] = useState({ name: '', classification: 'wants' })
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank' })
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '' })
  const [split, setSplit] = useState({ needs: 50, wants: 30, savings: 20 })
  const [savingSplit, setSavingSplit] = useState(false)
  const [cloneStatus, setCloneStatus] = useState('idle') // idle | working | done

  const load = async () => {
    const [cats, accs, gls, fin] = await Promise.all([
      listCategories(user.id),
      listAccounts(user.id),
      listGoals(user.id),
      getFinancialSettings(user.id),
    ])
    setCategories(cats)
    setAccounts(accs)
    setGoals(gls)
    setFinancial(fin)
    setSplit({ needs: fin.needs_pct, wants: fin.wants_pct, savings: fin.savings_pct })
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return
    await createCategory(user.id, newCategory)
    setNewCategory({ name: '', classification: 'wants' })
    load()
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    if (!newAccount.name.trim()) return
    await createAccount(user.id, newAccount)
    setNewAccount({ name: '', type: 'bank' })
    load()
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!newGoal.name.trim()) return
    await createGoal(user.id, { name: newGoal.name, targetAmount: newGoal.targetAmount ? Number(newGoal.targetAmount) : null })
    setNewGoal({ name: '', targetAmount: '' })
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

  const splitTotal = Number(split.needs) + Number(split.wants) + Number(split.savings)

  if (!categories || !accounts || !goals || !financial) {
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
        <CardHeader title="Objetivo 50 / 30 / 20" subtitle="Debe sumar 100%" />
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
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Tags size={14} className="text-ink-faint" />
                <span className="text-sm text-ink">{c.name}</span>
                <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full capitalize">{c.classification}</span>
              </div>
              <button onClick={async () => { await deactivateCategory(c.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
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
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Landmark size={14} className="text-ink-faint" />
                <span className="text-sm text-ink">{a.name}</span>
                <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full capitalize">{a.type}</span>
              </div>
              <button onClick={async () => { await deactivateAccount(a.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddAccount} className="flex gap-2">
          <Input placeholder="Nueva cuenta" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
          <Select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })} className="max-w-[130px]">
            <option value="bank">Banco</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Metas de ahorro" icon={PiggyBank} />
        <ul className="divide-y divide-border mb-4">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-ink-faint" />
                <span className="text-sm text-ink">{g.name}</span>
                {g.target_amount && <span className="text-xs text-ink-faint">meta: {g.target_amount}</span>}
              </div>
              <button onClick={async () => { await deactivateGoal(g.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddGoal} className="flex gap-2">
          <Input placeholder="Nueva meta" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} />
          <Input type="number" placeholder="Monto objetivo" value={newGoal.targetAmount} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })} className="max-w-[140px]" />
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>
    </div>
  )
}
