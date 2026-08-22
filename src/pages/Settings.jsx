import { useEffect, useState } from 'react'
import { Copy, CheckCircle2, Download, FileText, User, Lock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
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
      setPasswordError('Mínimo 8 caracteres.')
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
      <h1 className="font-display font-semibold text-xl text-ink">Ajustes</h1>

      <Card>
        <CardHeader title="Cuenta" icon={User} />
        <form onSubmit={handleSaveName} className="space-y-4">
          <Field label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input value={user.email} disabled className="opacity-60" />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={savingName}>Guardar nombre</Button>
            {nameSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> Guardado</span>}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Cambiar contraseña" icon={Lock} />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {passwordError && <p className="text-alert text-sm">{passwordError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={savingPassword}>Actualizar contraseña</Button>
            {passwordSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14} /> Actualizada</span>}
          </div>
        </form>
      </Card>

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
        <CardHeader title="Objetivo de distribución" subtitle="Elige un preset o personaliza los porcentajes — debe sumar 100%" />
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
        <CardHeader title="Exportar / respaldar datos" subtitle="Descarga todo tu histórico, no solo el mes actual" icon={Download} />
        <div className="space-y-4">
          <div>
            <Button variant="secondary" onClick={handleExportCSV} loading={exportingCSV}>
              <Download size={16} /> Exportar historial completo (CSV)
            </Button>
            <p className="text-xs text-ink-faint mt-1.5">Descarga 4 archivos: ingresos, gastos, aportes de ahorro y balances de cuenta.</p>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Reporte anual PDF">
              <Input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="max-w-[120px]" />
            </Field>
            <Button variant="secondary" onClick={handleExportPDF} loading={exportingPDF}>
              <FileText size={16} /> Generar PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Zona de peligro" icon={AlertTriangle} />
        <div className="space-y-3">
          <Button variant="danger" onClick={signOut}>Cerrar sesión</Button>
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-sm text-ink">Borrar todos mis datos</p>
            <p className="text-xs text-ink-faint">
              Borra permanentemente todo tu historial financiero (cuentas, gastos, ingresos, ahorros, inversiones, deudas, tarjetas). No borra tu acceso de inicio de sesión — eso requiere una función de servidor que esta app no tiene configurada; si de verdad quieres cerrar la cuenta por completo, dilo y te explico cómo pedirlo.
            </p>
            <Field label={`Escribe tu correo (${user.email}) para confirmar`}>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={user.email} />
            </Field>
            <Button
              variant="danger"
              onClick={handleWipeData}
              loading={deleting}
              disabled={deleteConfirmText !== user.email}
            >
              Borrar todos mis datos
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
