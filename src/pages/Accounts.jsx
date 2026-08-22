import { useEffect, useState } from 'react'
import { Landmark, Wallet, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Trash2, AlertTriangle, Pencil, X, Check, CreditCard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import {
  listAccounts,
  getAccountBalancesForPeriod,
  setAccountBalance,
  getAccountSeed,
  recomputeAccountBalances,
  getAccountMovementBreakdown,
  computeAccountBalance,
  getDistributionsForPeriod,
  setDistribution,
} from '../services/accounts'
import { listTransfersForPeriod, createTransfer, deleteTransfer } from '../services/transfers'
import { listCreditCards, getCreditCardUsageForPeriod, setCreditCardBalance, getNetWorthForPeriod } from '../services/networth'
import { listDebts, createDebt, updateDebt, deactivateDebt } from '../services/debts'
import { getLatestRatesToDOP } from '../services/exchangeRates'
import { projectDebtPayoff, convertToDOP } from '../utils/finance'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { formatMoney, formatPercent } from '../utils/format'

export default function Accounts() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({})
  const [seedByAccount, setSeedByAccount] = useState({})
  const [initialInputs, setInitialInputs] = useState({})
  const [expandedAccountId, setExpandedAccountId] = useState(null)
  const [breakdownByAccount, setBreakdownByAccount] = useState({})
  const [distributions, setDistributions] = useState({})
  const [cards, setCards] = useState([])
  const [cardUsage, setCardUsage] = useState({})
  const [transfers, setTransfers] = useState([])
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', note: '' })
  const [transferWarning, setTransferWarning] = useState(null)
  const [savingTransfer, setSavingTransfer] = useState(false)
  const [debts, setDebts] = useState([])
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', interestRate: '', minimumPayment: '', dueDate: '' })
  const [editingDebtId, setEditingDebtId] = useState(null)
  const [editDebtForm, setEditDebtForm] = useState({ name: '', balance: '', interestRate: '', minimumPayment: '', dueDate: '' })
  const [simPayment, setSimPayment] = useState({})
  const [netWorth, setNetWorth] = useState(0)
  const [ratesToDOP, setRatesToDOP] = useState({})

  const load = async () => {
    const accs = await listAccounts(user.id)
    // el balance se calcula a partir de movimientos, así que primero se recalcula
    // (sana automáticamente cualquier dato histórico desactualizado)
    await Promise.all(accs.map((a) => recomputeAccountBalances(user.id, a.id)))
    const [bals, dists, crds, usage, seeds, trans, dbts, nw, rates] = await Promise.all([
      getAccountBalancesForPeriod(user.id, currentPeriod.id),
      getDistributionsForPeriod(user.id, currentPeriod.id),
      listCreditCards(user.id),
      getCreditCardUsageForPeriod(user.id, currentPeriod.id),
      Promise.all(accs.map((a) => getAccountSeed(user.id, a.id))),
      listTransfersForPeriod(user.id, currentPeriod.id),
      listDebts(user.id),
      getNetWorthForPeriod(user.id, currentPeriod.id),
      getLatestRatesToDOP(user.id),
    ])
    setAccounts(accs)
    setBalances(Object.fromEntries(bals.map((b) => [b.account_id, b.balance])))
    setSeedByAccount(Object.fromEntries(accs.map((a, i) => [a.id, seeds[i]])))
    setDistributions(Object.fromEntries(dists.map((d) => [d.account_id, d.amount])))
    setCards(crds)
    setCardUsage(Object.fromEntries(usage.map((u) => [u.card_id, u.balance])))
    setDebts(dbts)
    setNetWorth(Number(nw.net_worth ?? 0))
    setTransfers(trans)
    setRatesToDOP(rates)
    setBreakdownByAccount({})
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const isSeedPeriod = (accountId) => {
    const seed = seedByAccount[accountId]
    return !seed || seed.period_id === currentPeriod.id
  }

  const handleInitialBalanceChange = (accountId, value) => {
    setInitialInputs((v) => ({ ...v, [accountId]: value }))
  }
  const handleInitialBalanceBlur = async (accountId, value) => {
    if (value === '' || value === undefined) return
    await setAccountBalance(user.id, accountId, currentPeriod.id, Number(value))
    await recomputeAccountBalances(user.id, accountId)
    load()
  }

  const toggleBreakdown = async (accountId) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null)
      return
    }
    setExpandedAccountId(accountId)
    if (!breakdownByAccount[accountId]) {
      const b = await getAccountMovementBreakdown(user.id, accountId, currentPeriod.id)
      setBreakdownByAccount((prev) => ({ ...prev, [accountId]: b }))
    }
  }

  useEffect(() => {
    if (!transferForm.fromAccountId || !transferForm.amount || !user || !currentPeriod) {
      setTransferWarning(null)
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      const { balance } = await computeAccountBalance(user.id, transferForm.fromAccountId, currentPeriod.id)
      if (!active) return
      const projected = balance - Number(transferForm.amount)
      setTransferWarning(
        projected < 0
          ? `Esa cuenta quedaría en ${formatMoney(projected)} (balance negativo) si mueves este monto.`
          : null
      )
    }, 400)
    return () => { active = false; clearTimeout(timer) }
  }, [transferForm.fromAccountId, transferForm.amount, user, currentPeriod])

  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    if (transferForm.fromAccountId === transferForm.toAccountId) return
    setSavingTransfer(true)
    await createTransfer(user.id, currentPeriod.id, {
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amount: Number(transferForm.amount),
      note: transferForm.note,
    })
    setSavingTransfer(false)
    setTransferModalOpen(false)
    setTransferWarning(null)
    setTransferForm({ fromAccountId: '', toAccountId: '', amount: '', note: '' })
    load()
  }

  const handleDeleteTransfer = async (transferId) => {
    await deleteTransfer(transferId, user.id)
    load()
  }

  const accountName = (id) => accounts.find((a) => a.id === id)?.name || '—'

  const handleAddDebt = async (e) => {
    e.preventDefault()
    if (!newDebt.name.trim() || newDebt.balance === '') return
    await createDebt(user.id, {
      name: newDebt.name,
      balance: Number(newDebt.balance),
      interestRate: newDebt.interestRate ? Number(newDebt.interestRate) : 0,
      minimumPayment: newDebt.minimumPayment ? Number(newDebt.minimumPayment) : 0,
      dueDate: newDebt.dueDate || null,
    })
    setNewDebt({ name: '', balance: '', interestRate: '', minimumPayment: '', dueDate: '' })
    load()
  }

  const startEditDebt = (debt) => {
    setEditingDebtId(debt.id)
    setEditDebtForm({
      name: debt.name,
      balance: debt.balance,
      interestRate: debt.interest_rate,
      minimumPayment: debt.minimum_payment,
      dueDate: debt.due_date || '',
    })
  }
  const cancelEditDebt = () => setEditingDebtId(null)
  const saveEditDebt = async (debtId) => {
    if (!editDebtForm.name.trim()) return
    await updateDebt(debtId, {
      name: editDebtForm.name,
      balance: Number(editDebtForm.balance),
      interest_rate: Number(editDebtForm.interestRate || 0),
      minimum_payment: Number(editDebtForm.minimumPayment || 0),
      due_date: editDebtForm.dueDate || null,
    })
    setEditingDebtId(null)
    load()
  }

  const totalActiveDebts = debts.reduce((s, d) => s + Number(d.balance), 0)

  const handleDistributionChange = (accountId, value) => {
    setDistributions((d) => ({ ...d, [accountId]: value }))
  }
  const handleDistributionBlur = async (accountId, value) => {
    if (value === '' || value === undefined) return
    await setDistribution(user.id, accountId, currentPeriod.id, Number(value))
  }

  const handleCardUsageBlur = async (cardId, value) => {
    if (value === '' || value === undefined) return
    await setCreditCardBalance(user.id, cardId, currentPeriod.id, Number(value))
  }

  // convierte cada cuenta a DOP antes de sumar (si falta la tasa de una moneda, esa cuenta no entra en el total)
  const totalBalance = accounts.reduce((s, acc) => {
    const converted = convertToDOP(balances[acc.id] ?? 0, acc.currency, ratesToDOP)
    return converted === null ? s : s + converted
  }, 0)
  const totalDistribution = Object.values(distributions).reduce((s, v) => s + Number(v || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-semibold text-xl text-ink">Cuentas</h1>
        <p className="text-ink-muted text-sm tabular">Balance total del mes: {formatMoney(totalBalance)}</p>
      </div>

      <Card>
        <CardHeader
          title="Balances por cuenta"
          subtitle="Calculado a partir de tus movimientos históricos (ingresos, gastos, ahorros y transferencias)"
          action={
            <Button variant="secondary" onClick={() => setTransferModalOpen(true)} className="shrink-0">
              <ArrowRightLeft size={15} /> Mover dinero
            </Button>
          }
        />
        <div className="space-y-3">
          {accounts.map((acc) => {
            const seedHere = isSeedPeriod(acc.id)
            const breakdown = breakdownByAccount[acc.id]
            const expanded = expandedAccountId === acc.id
            return (
              <div key={acc.id} className="border-b border-border last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Landmark size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-ink">{acc.name}</span>
                      {acc.currency && acc.currency !== 'DOP' && (
                        <span className="ml-1.5 text-[11px] text-ink-faint bg-surface-sunken px-1.5 py-0.5 rounded-full">{acc.currency}</span>
                      )}
                      {seedHere && (
                        <p className="text-[11px] text-ink-faint">Balance inicial declarado</p>
                      )}
                    </div>
                  </div>

                  {seedHere ? (
                    <Input
                      type="number"
                      step="0.01"
                      className="max-w-[160px] text-right tabular"
                      value={initialInputs[acc.id] ?? balances[acc.id] ?? ''}
                      onChange={(e) => handleInitialBalanceChange(acc.id, e.target.value)}
                      onBlur={(e) => handleInitialBalanceBlur(acc.id, e.target.value)}
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="tabular font-medium text-ink text-sm block">{formatMoney(balances[acc.id] ?? 0, acc.currency || 'DOP')}</span>
                        {acc.currency && acc.currency !== 'DOP' && (
                          <span className="tabular text-[11px] text-ink-faint block">
                            {(() => {
                              const converted = convertToDOP(balances[acc.id] ?? 0, acc.currency, ratesToDOP)
                              return converted === null ? 'sin tasa disponible' : `≈ ${formatMoney(converted)}`
                            })()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleBreakdown(acc.id)}
                        className="text-ink-faint hover:text-ink transition-colors"
                        aria-label="Ver desglose"
                      >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  )}
                </div>

                {expanded && breakdown && (
                  <div className="mt-2 ml-[42px] grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <p className="text-ink-faint">Ingresos</p>
                      <p className="tabular font-medium text-emerald-500">+{formatMoney(breakdown.income)}</p>
                    </div>
                    <div>
                      <p className="text-ink-faint">Gastos</p>
                      <p className="tabular font-medium text-alert">-{formatMoney(breakdown.expenses)}</p>
                    </div>
                    <div>
                      <p className="text-ink-faint">Ahorros</p>
                      <p className="tabular font-medium text-alert">-{formatMoney(breakdown.savings)}</p>
                    </div>
                    <div>
                      <p className="text-ink-faint">Transf. entrada</p>
                      <p className="tabular font-medium text-emerald-500">+{formatMoney(breakdown.transfersIn)}</p>
                    </div>
                    <div>
                      <p className="text-ink-faint">Transf. salida</p>
                      <p className="tabular font-medium text-alert">-{formatMoney(breakdown.transfersOut)}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {transfers.length > 0 && (
        <Card>
          <CardHeader title="Transferencias entre cuentas" subtitle="Movimientos de este mes — no cuentan como ingreso ni gasto" />
          <ul className="divide-y divide-border">
            {transfers.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft size={14} className="text-ink-faint" />
                  <span className="text-sm text-ink">{accountName(t.from_account_id)} → {accountName(t.to_account_id)}</span>
                  {t.note && <span className="text-xs text-ink-faint">· {t.note}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular font-medium text-ink text-sm">{formatMoney(t.amount)}</span>
                  <button onClick={() => handleDeleteTransfer(t.id)} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Distribución planificada"
          subtitle="Cuánto piensas mover a cada cuenta este mes"
          action={<span className="tabular text-sm font-medium text-ink-muted">{formatMoney(totalDistribution)}</span>}
        />
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <Wallet size={16} className="text-info" />
                </div>
                <span className="text-sm font-medium text-ink">{acc.name}</span>
              </div>
              <Input
                type="number"
                step="0.01"
                className="max-w-[160px] text-right tabular"
                value={distributions[acc.id] ?? ''}
                onChange={(e) => handleDistributionChange(acc.id, e.target.value)}
                onBlur={(e) => handleDistributionBlur(acc.id, e.target.value)}
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
      </Card>

      {cards.length > 0 && (
        <Card>
          <CardHeader title="Tarjetas de crédito" subtitle="Uso del mes vs límite" />
          <div className="space-y-4">
            {cards.map((card) => {
              const usage = Number(cardUsage[card.id] ?? 0)
              const pct = card.credit_limit > 0 ? (usage / card.credit_limit) * 100 : 0
              return (
                <div key={card.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink">{card.name}</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="max-w-[140px] text-right tabular"
                      defaultValue={cardUsage[card.id] ?? ''}
                      onBlur={(e) => handleCardUsageBlur(card.id, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? 'bg-alert' : pct > 50 ? 'bg-warn' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-faint mt-1">
                    {formatPercent(pct, 0)} de {formatMoney(card.credit_limit)}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Deudas"
          subtitle="Balance actual, no por período — se edita en el momento"
          icon={CreditCard}
          action={
            debts.length > 0 && (
              <span className="tabular text-sm font-medium text-ink-muted">Total: {formatMoney(totalActiveDebts)}</span>
            )
          }
        />

        {debts.length > 0 && (
          <p className="text-xs text-ink-faint mb-4">
            Patrimonio neto incluyendo deudas (estimado, no reemplaza el KPI del panel): {formatMoney(netWorth - totalActiveDebts)}
          </p>
        )}

        <ul className="divide-y divide-border mb-4">
          {debts.map((d) => {
            if (editingDebtId === d.id) {
              return (
                <li key={d.id} className="py-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input placeholder="Nombre" value={editDebtForm.name} onChange={(e) => setEditDebtForm({ ...editDebtForm, name: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Balance" value={editDebtForm.balance} onChange={(e) => setEditDebtForm({ ...editDebtForm, balance: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Tasa anual %" value={editDebtForm.interestRate} onChange={(e) => setEditDebtForm({ ...editDebtForm, interestRate: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Pago mínimo" value={editDebtForm.minimumPayment} onChange={(e) => setEditDebtForm({ ...editDebtForm, minimumPayment: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={editDebtForm.dueDate} onChange={(e) => setEditDebtForm({ ...editDebtForm, dueDate: e.target.value })} className="max-w-[180px]" />
                    <button onClick={() => saveEditDebt(d.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEditDebt} className="text-ink-faint hover:text-ink transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </li>
              )
            }

            const simValue = simPayment[d.id] ?? d.minimum_payment
            const projection = projectDebtPayoff({
              balance: Number(d.balance),
              annualRate: Number(d.interest_rate),
              monthlyPayment: Number(simValue),
            })

            return (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={14} className="text-ink-faint" />
                    <span className="text-sm font-medium text-ink">{d.name}</span>
                    {d.due_date && <span className="text-xs text-ink-faint">vence {d.due_date}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular font-medium text-alert text-sm">{formatMoney(d.balance)}</span>
                    <button onClick={() => startEditDebt(d)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={async () => { await deactivateDebt(d.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-ink-faint">
                  <span>Tasa anual: {formatPercent(Number(d.interest_rate))}</span>
                  <span>Pago mínimo: {formatMoney(d.minimum_payment)}</span>
                  <span className="flex items-center gap-1.5">
                    Simular pago mensual:
                    <Input
                      type="number"
                      step="0.01"
                      value={simValue}
                      onChange={(e) => setSimPayment((s) => ({ ...s, [d.id]: e.target.value }))}
                      className="max-w-[110px] tabular"
                    />
                  </span>
                  {projection.months === null ? (
                    <span className="text-alert">Con ese pago, nunca se termina de pagar (no cubre el interés mensual).</span>
                  ) : (
                    <span className="text-ink-muted">
                      {projection.months} {projection.months === 1 ? 'mes' : 'meses'} para pagarla · {formatMoney(projection.totalInterest)} en intereses
                    </span>
                  )}
                </div>
              </li>
            )
          })}
          {debts.length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Sin deudas registradas.</li>
          )}
        </ul>

        <form onSubmit={handleAddDebt} className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input placeholder="Nombre" value={newDebt.name} onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Balance" value={newDebt.balance} onChange={(e) => setNewDebt({ ...newDebt, balance: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Tasa anual %" value={newDebt.interestRate} onChange={(e) => setNewDebt({ ...newDebt, interestRate: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Pago mínimo" value={newDebt.minimumPayment} onChange={(e) => setNewDebt({ ...newDebt, minimumPayment: e.target.value })} />
          <div className="flex gap-2">
            <Input type="date" value={newDebt.dueDate} onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })} />
            <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
          </div>
        </form>
      </Card>

      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Mover dinero">
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Field label="Desde">
            <Select value={transferForm.fromAccountId} onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })} required>
              <option value="">Selecciona una cuenta</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Hacia">
            <Select value={transferForm.toAccountId} onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })} required>
              <option value="">Selecciona una cuenta</option>
              {accounts.filter((a) => a.id !== transferForm.fromAccountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" step="0.01" required value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
          </Field>
          <Field label="Nota (opcional)">
            <Input value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} />
          </Field>
          {transferWarning && (
            <div className="flex items-start gap-2 text-xs text-warn bg-warn/10 border border-warn/30 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{transferWarning}</span>
            </div>
          )}
          <Button
            type="submit"
            loading={savingTransfer}
            disabled={!transferForm.fromAccountId || !transferForm.toAccountId || transferForm.fromAccountId === transferForm.toAccountId}
            className="w-full"
          >
            Mover dinero
          </Button>
        </form>
      </Modal>
    </div>
  )
}
