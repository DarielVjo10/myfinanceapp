import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import {
  listInvestments,
  createInvestment,
  updateInvestment,
  deactivateInvestment,
  addInvestmentContribution,
  getTotalContributed,
  setValuation,
  getLatestValuation,
  getValuationHistory,
} from '../services/investments'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { EmptyState, Skeleton } from '../components/ui/Feedback'
import { formatMoney, formatPercent, monthShort } from '../utils/format'

const INVESTMENT_TYPES = ['Acciones', 'Fondo mutuo', 'CDT', 'Cripto', 'Bienes raíces', 'Otro']

export default function Investments() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [investments, setInvestments] = useState(null)
  const [valuationByInvestment, setValuationByInvestment] = useState({})
  const [contributedByInvestment, setContributedByInvestment] = useState({})
  const [historyByInvestment, setHistoryByInvestment] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [valuationInputs, setValuationInputs] = useState({})

  const [newInvestment, setNewInvestment] = useState({ name: '', investmentType: 'Acciones', expectedAnnualReturn: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', investmentType: 'Acciones', expectedAnnualReturn: '' })

  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [contribForm, setContribForm] = useState({ investmentId: '', amount: '', note: '' })
  const [savingContrib, setSavingContrib] = useState(false)

  const load = async () => {
    const invs = await listInvestments(user.id)
    const [valuations, contributed] = await Promise.all([
      Promise.all(invs.map((i) => getLatestValuation(user.id, i.id))),
      Promise.all(invs.map((i) => getTotalContributed(user.id, i.id))),
    ])
    setInvestments(invs)
    setValuationByInvestment(Object.fromEntries(invs.map((i, idx) => [i.id, valuations[idx]])))
    setContributedByInvestment(Object.fromEntries(invs.map((i, idx) => [i.id, contributed[idx]])))
    setContribForm((f) => ({ ...f, investmentId: f.investmentId || invs[0]?.id || '' }))
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleAddInvestment = async (e) => {
    e.preventDefault()
    if (!newInvestment.name.trim()) return
    await createInvestment(user.id, newInvestment)
    setNewInvestment({ name: '', investmentType: 'Acciones', expectedAnnualReturn: '' })
    load()
  }

  const startEdit = (inv) => {
    setEditingId(inv.id)
    setEditForm({ name: inv.name, investmentType: inv.investment_type || 'Otro', expectedAnnualReturn: inv.expected_annual_return ?? '' })
  }
  const cancelEdit = () => setEditingId(null)
  const saveEdit = async (id) => {
    if (!editForm.name.trim()) return
    await updateInvestment(id, {
      name: editForm.name,
      investment_type: editForm.investmentType,
      expected_annual_return: editForm.expectedAnnualReturn === '' ? null : Number(editForm.expectedAnnualReturn),
    })
    setEditingId(null)
    load()
  }

  const handleValuationBlur = async (investmentId, value) => {
    if (value === '' || value === undefined || !currentPeriod) return
    await setValuation(user.id, investmentId, currentPeriod.id, Number(value))
    load()
  }

  const toggleHistory = async (investmentId) => {
    if (expandedId === investmentId) {
      setExpandedId(null)
      return
    }
    setExpandedId(investmentId)
    if (!historyByInvestment[investmentId]) {
      const hist = await getValuationHistory(user.id, investmentId)
      setHistoryByInvestment((prev) => ({
        ...prev,
        [investmentId]: hist.map((h) => ({ label: monthShort(h.monthly_periods.year, h.monthly_periods.month), value: Number(h.value) })),
      }))
    }
  }

  const handleAddContribution = async (e) => {
    e.preventDefault()
    setSavingContrib(true)
    await addInvestmentContribution(user.id, contribForm.investmentId, currentPeriod.id, {
      amount: Number(contribForm.amount),
      note: contribForm.note,
    })
    setSavingContrib(false)
    setContribModalOpen(false)
    setContribForm({ investmentId: contribForm.investmentId, amount: '', note: '' })
    load()
  }

  if (investments === null) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-xl text-ink">Inversiones</h1>
        {investments.length > 0 && (
          <Button onClick={() => setContribModalOpen(true)}>
            <Plus size={16} /> Nuevo aporte
          </Button>
        )}
      </div>

      {investments.length === 0 ? (
        <Card>
          <EmptyState icon={TrendingUp} title="Sin inversiones aún" description="Agrega tu primera inversión abajo para empezar a rastrear su rendimiento." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {investments.map((inv) => {
            const valuation = valuationByInvestment[inv.id]
            const currentValue = Number(valuation?.value ?? 0)
            const contributed = Number(contributedByInvestment[inv.id] ?? 0)
            const gain = currentValue - contributed
            const gainPct = contributed > 0 ? (gain / contributed) * 100 : 0
            const isPositive = gain >= 0
            const history = historyByInvestment[inv.id]
            const expanded = expandedId === inv.id

            if (editingId === inv.id) {
              return (
                <Card key={inv.id} className="space-y-3">
                  <Input placeholder="Nombre" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <Select value={editForm.investmentType} onChange={(e) => setEditForm({ ...editForm, investmentType: e.target.value })}>
                    {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                  <Input type="number" step="0.01" placeholder="Rendimiento esperado % anual (opcional)" value={editForm.expectedAnnualReturn} onChange={(e) => setEditForm({ ...editForm, expectedAnnualReturn: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <Button onClick={() => saveEdit(inv.id)} className="shrink-0"><Check size={16} /></Button>
                    <Button variant="secondary" onClick={cancelEdit} className="shrink-0"><X size={16} /></Button>
                  </div>
                </Card>
              )
            }

            return (
              <Card key={inv.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{inv.name}</p>
                    <p className="text-xs text-ink-faint">{inv.investment_type || 'Otro'}{inv.expected_annual_return != null ? ` · esperado ${formatPercent(Number(inv.expected_annual_return))} anual` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(inv)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={async () => { await deactivateInvestment(inv.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-ink-faint text-xs mb-1">Valor actual</p>
                    <Input
                      type="number"
                      step="0.01"
                      className="tabular"
                      defaultValue={valuation?.value ?? ''}
                      onBlur={(e) => handleValuationBlur(inv.id, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <p className="text-ink-faint text-xs mb-1">Total aportado</p>
                    <p className="tabular font-medium text-ink text-sm pt-2.5">{formatMoney(contributed)}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-alert'}`}>
                  {isPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  <span className="tabular">{formatMoney(gain)}</span>
                  <span className="tabular">({isPositive ? '+' : ''}{formatPercent(gainPct)})</span>
                  <span className="text-ink-faint font-normal">ganancia/pérdida</span>
                </div>

                <button
                  onClick={() => toggleHistory(inv.id)}
                  className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink transition-colors mt-2"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Ver evolución
                </button>

                {expanded && (
                  history === undefined ? (
                    <Skeleton className="h-40 mt-2" />
                  ) : history.length < 2 ? (
                    <p className="text-xs text-ink-faint mt-2">Necesitas al menos 2 valuaciones históricas para ver el gráfico.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160} className="mt-2">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                        <Tooltip
                          formatter={(value) => [formatMoney(value), 'Valor']}
                          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Nueva inversión" />
        <form onSubmit={handleAddInvestment} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input placeholder="Nombre" value={newInvestment.name} onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })} />
          <Select value={newInvestment.investmentType} onChange={(e) => setNewInvestment({ ...newInvestment, investmentType: e.target.value })}>
            {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input type="number" step="0.01" placeholder="Rendimiento esperado % anual" value={newInvestment.expectedAnnualReturn} onChange={(e) => setNewInvestment({ ...newInvestment, expectedAnnualReturn: e.target.value })} />
          <Button type="submit" className="shrink-0"><Plus size={16} /> Agregar</Button>
        </form>
      </Card>

      <Modal open={contribModalOpen} onClose={() => setContribModalOpen(false)} title="Nuevo aporte a inversión">
        <form onSubmit={handleAddContribution} className="space-y-4">
          <Field label="Inversión">
            <Select value={contribForm.investmentId} onChange={(e) => setContribForm({ ...contribForm, investmentId: e.target.value })} required>
              {investments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required value={contribForm.amount} onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })} />
          </Field>
          <Field label="Nota (opcional)">
            <Input value={contribForm.note} onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })} />
          </Field>
          <Button type="submit" loading={savingContrib} className="w-full">Guardar aporte</Button>
        </form>
      </Modal>
    </div>
  )
}
