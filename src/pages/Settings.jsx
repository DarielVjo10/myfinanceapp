import { useEffect, useState } from 'react'
import { Copy, CheckCircle2, Download, FileText, User, Lock, AlertTriangle, Globe, Wallet, Calculator } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getFinancialSettings, updateFinancialSettings } from '../services/settings'
import { updatePassword, updateFullName, wipeAllUserData } from '../services/account'
import { cloneMonthConfig, getOrCreatePeriod } from '../services/periods'
import { exportFullHistory, exportAnnualReportPDF } from '../services/export'
import { listAccounts } from '../services/accounts'
import { getActivePayrollSettings, upsertPayrollSettings, deactivatePayrollSettings, getIsrBrackets } from '../services/payroll'
import { calculatePayrollNet, ISR_SOURCE_LABEL, TSS_AFP_RATE_DEFAULT, TSS_SFS_RATE_DEFAULT } from '../utils/payroll'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Feedback'
import { monthLabel, formatMoney } from '../utils/format'

const SPLIT_PRESETS = [
  { label: '50 / 30 / 20', needs: 50, wants: 30, savings: 20 },
  { label: '70 / 20 / 10', needs: 70, wants: 20, savings: 10 },
  { label: '60 / 20 / 20', needs: 60, wants: 20, savings: 20 },
  { label: '80 / 10 / 10', needs: 80, wants: 10, savings: 10 },
  { label: '40 / 30 / 30', needs: 40, wants: 30, savings: 30 },
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const { currentPeriod, switchToPeriod, refreshPeriods } = usePeriod()
  const { t, language, setLanguage } = useLanguage()

  const [financial, setFinancial] = useState(null)
  const [split, setSplit] = useState({ needs: 50, wants: 30, savings: 20 })
  const [savingSplit, setSavingSplit] = useState(false)
  const [cloneStatus, setCloneStatus] = useState('idle') // idle | working | done
  const [exportingCSV, setExportingCSV] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [isrBrackets, setIsrBrackets] = useState([])
  const [payrollSettings, setPayrollSettings] = useState(null)
  const [payrollForm, setPayrollForm] = useState({ name: 'Sueldo', grossSalary: '', afpRate: TSS_AFP_RATE_DEFAULT, sfsRate: TSS_SFS_RATE_DEFAULT, accountId: '', paymentDay: '' })
  const [savingPayroll, setSavingPayroll] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [calculatorGross, setCalculatorGross] = useState('')

  const load = async () => {
    // getIsrBrackets/getActivePayrollSettings dependen de la migración 016
    // (tablas payroll_settings/isr_brackets) — si todavía no corrió, no debe
    // tumbar el resto de Ajustes, solo dejar la sección de nómina vacía.
    const [fin, accs, brackets, payroll] = await Promise.all([
      getFinancialSettings(user.id),
      listAccounts(user.id),
      getIsrBrackets(2026).catch(() => []),
      getActivePayrollSettings(user.id).catch(() => null),
    ])
    setFinancial(fin)
    setSplit({ needs: fin.needs_pct, wants: fin.wants_pct, savings: fin.savings_pct })
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
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  const handleSaveName = async (e) => {
    e.preventDefault()
    setSavingName(true)
    setNameSaved(false)
    await updateFullName(fullName)
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError(t('settings.password.tooShort'))
      return
    }
    setSavingPassword(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2500)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleWipeData = async () => {
    if (deleteConfirmText !== user.email) return
    setDeleting(true)
    try {
      await wipeAllUserData(user.id)
      await signOut()
    } finally {
      setDeleting(false)
    }
  }

  const splitTotal = Number(split.needs) + Number(split.wants) + Number(split.savings)

  const payrollPreview = payrollForm.grossSalary
    ? calculatePayrollNet({
        grossSalary: Number(payrollForm.grossSalary),
        afpRate: Number(payrollForm.afpRate) || TSS_AFP_RATE_DEFAULT,
        sfsRate: Number(payrollForm.sfsRate) || TSS_SFS_RATE_DEFAULT,
        brackets: isrBrackets,
      })
    : null

  const calculatorPreview = calculatorGross
    ? calculatePayrollNet({ grossSalary: Number(calculatorGross), brackets: isrBrackets })
    : null

  if (!financial) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display font-semibold text-xl text-ink">{t('settings.title')}</h1>

      <Card>
        <CardHeader title={t('settings.account.title')} icon={User} />
        <form onSubmit={handleSaveName} className="space-y-4">
          <Field label={t('settings.account.fullName')}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label={t('settings.account.email')}>
            <Input value={user.email} disabled className="opacity-60" />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={savingName}>{t('settings.account.saveName')}</Button>
            {nameSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> {t('settings.account.saved')}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.password.title')} icon={Lock} />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label={t('settings.password.new')} hint={t('settings.password.hint')}>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {passwordError && <p className="text-alert text-sm">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={savingPassword}>{t('settings.password.update')}</Button>
            {passwordSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> {t('settings.password.updated')}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.language.title')} subtitle={t('settings.language.subtitle')} icon={Globe} />
        <div className="flex gap-2">
          {[
            { code: 'es', label: 'Español' },
            { code: 'en', label: 'English' },
          ].map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                language === opt.code
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                  : 'border-border text-ink-muted hover:border-emerald-500/40 hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.clone.title')}
          subtitle={
            currentPeriod
              ? `${t('settings.clone.subtitlePrefix')} ${monthLabel(currentPeriod.year, currentPeriod.month, language)} ${t('settings.clone.subtitleSuffix')}`
              : ''
          }
        />
        <Button onClick={handleCloneMonth} loading={cloneStatus === 'working'} variant="secondary">
          {cloneStatus === 'done' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {cloneStatus === 'done' ? t('settings.clone.done') : t('settings.clone.button')}
        </Button>
      </Card>

      <Card>
        <CardHeader
          title="Ingreso fijo (sueldo)"
          subtitle="Se calcula el neto según AFP, SFS e ISR — se registra solo cada mes, igual que un gasto recurrente"
          icon={Wallet}
          action={<Button variant="secondary" onClick={() => { setCalculatorGross(''); setCalculatorOpen(true) }}><Calculator size={16} /> Calculadora</Button>}
        />
        <form onSubmit={handleSavePayroll} className="space-y-4">
          <Field label="Nombre">
            <Input value={payrollForm.name} onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })} placeholder="Sueldo" />
          </Field>
          <Field label="Salario bruto mensual">
            <Input type="number" step="0.01" placeholder="0.00" value={payrollForm.grossSalary} onChange={(e) => setPayrollForm({ ...payrollForm, grossSalary: e.target.value })} required />
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
      </Card>

      <Card>
        <CardHeader title={t('settings.split.title')} subtitle={t('settings.split.subtitle')} />
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
          <Field label={t('settings.split.needs')}>
            <Input type="number" value={split.needs} onChange={(e) => setSplit({ ...split, needs: e.target.value })} />
          </Field>
          <Field label={t('settings.split.wants')}>
            <Input type="number" value={split.wants} onChange={(e) => setSplit({ ...split, wants: e.target.value })} />
          </Field>
          <Field label={t('settings.split.savings')}>
            <Input type="number" value={split.savings} onChange={(e) => setSplit({ ...split, savings: e.target.value })} />
          </Field>
          <div className="col-span-3 flex items-center justify-between">
            <span className={`text-xs ${splitTotal === 100 ? 'text-ink-faint' : 'text-alert'}`}>
              {t('settings.split.total')}: {splitTotal}% {splitTotal !== 100 && `— ${t('settings.split.mustBe100')}`}
            </span>
            <Button type="submit" loading={savingSplit} disabled={splitTotal !== 100} variant="secondary">
              {t('settings.split.save')}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={t('settings.export.title')} subtitle={t('settings.export.subtitle')} icon={Download} />
        <div className="space-y-4">
          <div>
            <Button variant="secondary" onClick={handleExportCSV} loading={exportingCSV}>
              <Download size={16} /> {t('settings.export.csv')}
            </Button>
            <p className="text-xs text-ink-faint mt-1.5">{t('settings.export.csvHint')}</p>
          </div>
          <div className="flex items-end gap-2">
            <Field label={t('settings.export.annualReport')}>
              <Input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="max-w-[120px]" />
            </Field>
            <Button variant="secondary" onClick={handleExportPDF} loading={exportingPDF}>
              <FileText size={16} /> {t('settings.export.generatePdf')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('settings.danger.title')} icon={AlertTriangle} />
        <div className="space-y-3">
          <Button variant="danger" onClick={signOut}>{t('settings.danger.signOut')}</Button>
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-sm text-ink">{t('settings.danger.wipeTitle')}</p>
            <p className="text-xs text-ink-faint">{t('settings.danger.wipeDescription')}</p>
            <Field label={t('settings.danger.confirmLabel', { email: user.email })}>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={user.email} />
            </Field>
            <Button
              variant="danger"
              onClick={handleWipeData}
              loading={deleting}
              disabled={deleteConfirmText !== user.email}
            >
              {t('settings.danger.wipeButton')}
            </Button>
          </div>
        </div>
      </Card>

      <Modal open={calculatorOpen} onClose={() => setCalculatorOpen(false)} title="Calculadora de Sueldo RD">
        <div className="space-y-4">
          <p className="text-xs text-ink-faint">
            Escribe cualquier salario bruto para ver el desglose al instante — no guarda nada ni afecta tus datos reales.
          </p>
          <Field label="Salario bruto mensual">
            <Input type="number" step="0.01" placeholder="0.00" autoFocus value={calculatorGross} onChange={(e) => setCalculatorGross(e.target.value)} />
          </Field>
          {calculatorPreview && (
            <div className="bg-surface-sunken rounded-lg p-3 space-y-1 text-sm">
              <PayrollBreakdownRow label="Salario bruto" value={calculatorPreview.grossSalary} />
              <PayrollBreakdownRow label={`AFP (${TSS_AFP_RATE_DEFAULT}%)`} value={-calculatorPreview.afp} negative />
              <PayrollBreakdownRow label={`SFS (${TSS_SFS_RATE_DEFAULT}%)`} value={-calculatorPreview.sfs} negative />
              <PayrollBreakdownRow label="ISR (mensual)" value={-calculatorPreview.isrMonthly} negative />
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <PayrollBreakdownRow label="Neto mensual" value={calculatorPreview.netSalary} bold />
              </div>
            </div>
          )}
          <p className="text-[11px] text-ink-faint">{ISR_SOURCE_LABEL}</p>
        </div>
      </Modal>
    </div>
  )
}

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
