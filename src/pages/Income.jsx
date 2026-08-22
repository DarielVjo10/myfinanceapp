import { useEffect, useState } from 'react'
import { Plus, Trash2, TrendingUp, BarChart3, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { useLanguage } from '../contexts/LanguageContext'
import { listIncomes, createIncome, deleteIncome, incomeTrendSeries } from '../services/incomes'
import { autoGeneratePayrollIncome, getActivePayrollSettings, upsertPayrollSettings, deactivatePayrollSettings, getIsrBrackets } from '../services/payroll'
import { listAccounts } from '../services/accounts'
import { lastNPeriods } from '../services/analytics'
import { calculatePayrollNet, ISR_SOURCE_LABEL, TSS_AFP_RATE_DEFAULT, TSS_SFS_RATE_DEFAULT } from '../utils/payroll'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { TrendBarChart } from '../components/charts/TrendBarChart'
import { formatMoney } from '../utils/format'

const TYPE_LABELS = { fixed: 'Fijo', extra: 'Extra', other: 'Otro' }

function PayrollBreakdownRow({ label, value, negative = false, bold = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-medium text-ink' : 'text-ink-muted'}>{label}</span>
      <span className={`tabular ${bold ? 'font-semibold text-ink' : negative ? 'text-alert' : 'text-ink'}`}>
        {negative && value !== 0 ? '-' : ''}{formatMoney(Math.abs(value))}
      </span>
    </div>
  )
}

export default function Income() {
  const { user } = useAuth()
  const { currentPeriod, allPeriods } = usePeriod()
  const { language } = useLanguage()
  const [incomes, setIncomes] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'fixed', source: '', accountId: '', amount: '', description: '', isPayroll: false })
  const [trendType, setTrendType] = useState(null)
  const [trendData, setTrendData] = useState(null)

  const [isrBrackets, setIsrBrackets] = useState([])
  const [payrollSettings, setPayrollSettings] = useState(null)
  const [payrollModalOpen, setPayrollModalOpen] = useState(false)
  const [payrollForm, setPayrollForm] = useState({ name: 'Sueldo', grossSalary: '', afpRate: TSS_AFP_RATE_DEFAULT, sfsRate: TSS_SFS_RATE_DEFAULT, accountId: '', paymentDay: '' })
  const [savingPayroll, setSavingPayroll] = useState(false)

  const load = async () => {
    // best-effort en el cliente: genera el ingreso de nómina de este
    // período si ya llegó el día de pago (ver services/payroll.js)
    await autoGeneratePayrollIncome(user.id, currentPeriod).catch(() => null)
    // getIsrBrackets/getActivePayrollSettings dependen de la migración 016 —
    // si todavía no corrió, no debe tumbar el resto de Ingresos
    const [inc, accs, brackets, payroll] = await Promise.all([
      listIncomes(user.id, currentPeriod.id),
      listAccounts(user.id),
      getIsrBrackets(2026).catch(() => []),
      getActivePayrollSettings(user.id).catch(() => null),
    ])
    setIncomes(inc)
    setAccounts(accs)
    setIsrBrackets(brackets)
    setPayrollSettings(payroll)
    if (payroll) {
      setPayrollForm({
        name: payroll.name,
        grossSalary: payroll.gross_salary,
        afpRate: payroll.afp_rate,
        sfsRate: payroll.sfs_rate,
        accountId: payroll.account_id || '',
        paymentDay: payroll.payment_day,
      })
    }
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const total = (incomes ?? []).reduce((s, i) => s + Number(i.amount), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    let amount = Number(form.amount)
    let description = form.description
    if (form.isPayroll) {
      const { netSalary } = calculatePayrollNet({ grossSalary: amount, brackets: isrBrackets })
      description = description || `Sueldo neto — bruto ${formatMoney(amount)}, AFP+SFS+ISR incluidos`
      amount = Math.round(netSalary * 100) / 100
    }
    await createIncome(user.id, currentPeriod.id, {
      type: form.isPayroll ? 'fixed' : form.type,
      source: form.source || (form.isPayroll ? 'Sueldo' : ''),
      accountId: form.accountId || null,
      amount,
      description,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ type: 'fixed', source: '', accountId: '', amount: '', description: '', isPayroll: false })
    load()
  }

  const handleDelete = async (id) => {
    await deleteIncome(id, user.id)
    load()
  }

  const handleSavePayroll = async (e) => {
    e.preventDefault()
    if (!payrollForm.grossSalary || !payrollForm.paymentDay) return
    setSavingPayroll(true)
    const saved = await upsertPayrollSettings(user.id, {
      id: payrollSettings?.id,
      name: payrollForm.name || 'Sueldo',
      grossSalary: Number(payrollForm.grossSalary),
      afpRate: Number(payrollForm.afpRate),
      sfsRate: Number(payrollForm.sfsRate),
      accountId: payrollForm.accountId || null,
      paymentDay: Number(payrollForm.paymentDay),
    })
    setPayrollSettings(saved)
    setSavingPayroll(false)
  }

  const handleDeactivatePayroll = async () => {
    if (!payrollSettings) return
    await deactivatePayrollSettings(payrollSettings.id)
    setPayrollSettings(null)
    setPayrollForm({ name: 'Sueldo', grossSalary: '', afpRate: TSS_AFP_RATE_DEFAULT, sfsRate: TSS_SFS_RATE_DEFAULT, accountId: '', paymentDay: '' })
  }

  const openTrend = async (type) => {
    setTrendType(type)
    setTrendData(null)
    const periods = lastNPeriods(allPeriods, 12)
    const series = await incomeTrendSeries(user.id, type, periods, language)
    setTrendData(series)
  }

  // se recalcula en cada tecla mientras el checkbox "Es mi sueldo" esté
  // marcado — así el desglose de AFP/SFS/ISR aparece de inmediato, sin
  // pasos adicionales, apenas se elige que el ingreso es un sueldo
  const newIncomePayrollPreview = form.isPayroll && form.amount
    ? calculatePayrollNet({ grossSalary: Number(form.amount), brackets: isrBrackets })
    : null

  const payrollPreview = payrollForm.grossSalary
    ? calculatePayrollNet({
        grossSalary: Number(payrollForm.grossSalary),
        afpRate: Number(payrollForm.afpRate) || TSS_AFP_RATE_DEFAULT,
        sfsRate: Number(payrollForm.sfsRate) || TSS_SFS_RATE_DEFAULT,
        brackets: isrBrackets,
      })
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-semibold text-xl text-ink">Ingresos</h1>
          <p className="text-ink-muted text-sm tabular">Total del mes: {formatMoney(total)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => setPayrollModalOpen(true)}>
            <Wallet size={16} /> Sueldo automático
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nuevo ingreso
          </Button>
        </div>
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
          {!form.isPayroll && (
            <Field label="Tipo">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="fixed">Fijo</option>
                <option value="extra">Extra</option>
                <option value="other">Otro</option>
              </Select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={form.isPayroll}
              onChange={(e) => setForm({ ...form, isPayroll: e.target.checked })}
            />
            Es mi sueldo — calcular AFP+SFS+ISR automáticamente
          </label>
          <Field label="Fuente">
            <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Salario, freelance…" />
          </Field>
          <Field label="Cuenta destino">
            <Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">Sin especificar</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label={form.isPayroll ? 'Salario bruto mensual' : 'Monto'}>
            <Input type="number" step="0.01" required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          {newIncomePayrollPreview && (
            <div className="bg-surface-sunken rounded-lg p-3 space-y-1 text-xs">
              <PayrollBreakdownRow label="Salario bruto" value={newIncomePayrollPreview.grossSalary} />
              <PayrollBreakdownRow label="AFP" value={-newIncomePayrollPreview.afp} negative />
              <PayrollBreakdownRow label="SFS" value={-newIncomePayrollPreview.sfs} negative />
              <PayrollBreakdownRow label="ISR (mensual)" value={-newIncomePayrollPreview.isrMonthly} negative />
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <PayrollBreakdownRow label="Neto (esto es lo que se guarda)" value={newIncomePayrollPreview.netSalary} bold />
              </div>
            </div>
          )}
          <Field label="Descripción (opcional)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {form.isPayroll && <p className="text-[11px] text-ink-faint">{ISR_SOURCE_LABEL}</p>}
          <Button type="submit" loading={saving} className="w-full">Guardar</Button>
        </form>
      </Modal>

      <Modal open={payrollModalOpen} onClose={() => setPayrollModalOpen(false)} title="Sueldo automático (nómina)">
        <form onSubmit={handleSavePayroll} className="space-y-4">
          <p className="text-xs text-ink-faint">
            Configura tu sueldo recurrente una sola vez y se registrará automáticamente cada mes (neto, según AFP+SFS+ISR) el día de pago que elijas — igual que un gasto recurrente. Si solo quieres ver el desglose de un salario sin guardar nada, escríbelo aquí abajo y no le des a Guardar.
          </p>
          <Field label="Nombre">
            <Input value={payrollForm.name} onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })} placeholder="Sueldo" />
          </Field>
          <Field label="Salario bruto mensual">
            <Input type="number" step="0.01" placeholder="0.00" autoFocus value={payrollForm.grossSalary} onChange={(e) => setPayrollForm({ ...payrollForm, grossSalary: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tasa AFP %" hint="Ley 87-01, ajustable si cambia">
              <Input type="number" step="0.01" value={payrollForm.afpRate} onChange={(e) => setPayrollForm({ ...payrollForm, afpRate: e.target.value })} />
            </Field>
            <Field label="Tasa SFS %" hint="Ley 87-01, ajustable si cambia">
              <Input type="number" step="0.01" value={payrollForm.sfsRate} onChange={(e) => setPayrollForm({ ...payrollForm, sfsRate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de pago" hint="Día del mes en que cae el sueldo">
              <Input type="number" min="1" max="31" value={payrollForm.paymentDay} onChange={(e) => setPayrollForm({ ...payrollForm, paymentDay: e.target.value })} required />
            </Field>
            <Field label="Cuenta destino (opcional)">
              <Select value={payrollForm.accountId} onChange={(e) => setPayrollForm({ ...payrollForm, accountId: e.target.value })}>
                <option value="">Sin especificar</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>

          {payrollPreview && (
            <div className="bg-surface-sunken rounded-lg p-3 space-y-1 text-xs">
              <PayrollBreakdownRow label="Salario bruto" value={payrollPreview.grossSalary} />
              <PayrollBreakdownRow label="AFP" value={-payrollPreview.afp} negative />
              <PayrollBreakdownRow label="SFS" value={-payrollPreview.sfs} negative />
              <PayrollBreakdownRow label="ISR (mensual)" value={-payrollPreview.isrMonthly} negative />
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <PayrollBreakdownRow label="Neto mensual" value={payrollPreview.netSalary} bold />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={savingPayroll}>
              {payrollSettings ? 'Actualizar' : 'Guardar'}
            </Button>
            {payrollSettings && (
              <Button type="button" variant="ghost" onClick={handleDeactivatePayroll}>Desactivar</Button>
            )}
          </div>
          <p className="text-[11px] text-ink-faint">{ISR_SOURCE_LABEL}</p>
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
