import { useEffect, useState } from 'react'
import { Copy, CheckCircle2, Download, FileText, User, Lock, AlertTriangle, Globe, HelpCircle } from 'lucide-react'
import { ONBOARDING_STORAGE_KEY } from '../components/onboarding/OnboardingTour'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getFinancialSettings, updateFinancialSettings } from '../services/settings'
import { updatePassword, updateFullName, wipeAllUserData } from '../services/account'
import { cloneMonthConfig, getOrCreatePeriod } from '../services/periods'
import { exportFullHistory, exportAnnualReportPDF } from '../services/export'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Feedback'
import { monthLabel } from '../utils/format'

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

  const load = async () => {
    const fin = await getFinancialSettings(user.id)
    setFinancial(fin)
    setSplit({ needs: fin.needs_pct, wants: fin.wants_pct, savings: fin.savings_pct })
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
        <CardHeader title="Ayuda" subtitle="Repite el recorrido guiado por las funcionalidades principales" icon={HelpCircle} />
        <Button
          variant="secondary"
          onClick={() => {
            localStorage.removeItem(ONBOARDING_STORAGE_KEY)
            window.dispatchEvent(new Event('replay-onboarding'))
          }}
        >
          Ver tutorial de nuevo
        </Button>
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

    </div>
  )
}
