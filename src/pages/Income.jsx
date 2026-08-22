import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { useLanguage } from '../contexts/LanguageContext'
import { listIncomes, createIncome, deleteIncome, incomeTrendSeries } from '../services/incomes'
import { autoGeneratePayrollIncome } from '../services/payroll'
import { listAccounts } from '../services/accounts'
import { lastNPeriods } from '../services/analytics'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { TrendBarChart } from '../components/charts/TrendBarChart'
import { formatMoney } from '../utils/format'

const TYPE_LABELS = { fixed: 'Fijo', extra: 'Extra', other: 'Otro' }

export default function Income() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const { language } = useLanguage()
  const [incomes, setIncomes] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'fixed', source: '', accountId: '', amount: '', description: '' })
  const [trendType, setTrendType] = useState(null)
  const [trendData, setTrendData] = useState(null)

  const load = async () => {
    // best-effort en el cliente: genera el ingreso de nómina de este
    // período si ya llegó el día de pago (ver services/payroll.js)
    await autoGeneratePayrollIncome(user.id, currentPeriod).catch(() => null)
    const [inc, accs] = await Promise.all([
      listIncomes(user.id, currentPeriod.id),
      listAccounts(user.id),
    ])
    setIncomes(inc)
    setAccounts(accs)
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const total = (incomes ?? []).reduce((s, i) => s + Number(i.amount), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await createIncome(user.id, currentPeriod.id, {
      type: form.type,
      source: form.source,
      accountId: form.accountId || null,
      amount: Number(form.amount),
      description: form.description,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ type: 'fixed', source: '', accountId: '', amount: '', description: '' })
    load()
  }

  const handleDelete = async (id) => {
    await deleteIncome(id, user.id)
    load()
  }

  const openTrend = async (type) => {
    setTrendType(type)
    setTrendData(null)
    const periods = lastNPeriods(allPeriods, 12)
    const series = await incomeTrendSeries(user.id, type, periods, language)
    setTrendData(series)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-xl text-ink">Ingresos</h1>
          <p className="text-ink-muted text-sm tabular">Total del mes: {formatMoney(total)}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo ingreso
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {incomes === null ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : incomes.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Sin ingresos este mes" description="Registra tu primer ingreso para este período." />
        ) : (
          <ul className="divide-y divide-border">
            {incomes.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink">{inc.source || TYPE_LABELS[inc.type]}</p>
                  <p className="text-xs text-ink-faint flex items-center gap-1.5">
                    <button onClick={() => openTrend(inc.type)} className="hover:text-info hover:underline transition-colors flex items-center gap-1" aria-label="Ver tendencia">
                      {TYPE_LABELS[inc.type]} <BarChart3 size={11} />
                    </button>
                    · {inc.accounts?.name || 'Sin cuenta'} · {inc.income_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular font-medium text-emerald-500 text-sm">{formatMoney(inc.amount)}</span>
                  <button onClick={() => handleDelete(inc.id)} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo ingreso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Tipo">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fixed">Fijo</option>
              <option value="extra">Extra</option>
              <option value="other">Otro</option>
            </Select>
          </Field>
          <Field label="Fuente">
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Salario, freelance…" />
          </Field>
          <Field label="Cuenta destino">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Sin especificar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Descripción (opcional)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Button type="submit" loading={saving} className="w-full">Guardar</Button>
        </form>
      </Modal>

      <Modal open={!!trendType} onClose={() => setTrendType(null)} title={`Tendencia — ${TYPE_LABELS[trendType] ?? ''}`}>
        {trendData ? (
          trendData.some((d) => d.total > 0) ? (
            <TrendBarChart data={trendData} dataKey="total" label="Ingreso" color="#34D399" />
          ) : (
            <p className="text-sm text-ink-faint">Sin ingresos históricos de este tipo todavía.</p>
          )
        ) : (
          <Skeleton className="h-56 w-full" />
        )}
      </Modal>
    </div>
  )
}
