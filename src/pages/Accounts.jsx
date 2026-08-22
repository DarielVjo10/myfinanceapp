import { useEffect, useState } from 'react'
import { Landmark, Wallet, ChevronDown, ChevronUp, ArrowRightLeft, Plus, Trash2, AlertTriangle, Pencil, X, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import {
  listAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
  getAccountBalancesForPeriod,
  setAccountBalance,
  getAccountSeed,
  recomputeAccountBalances,
  getAccountMovementBreakdown,
  computeAccountBalance,
  getDistributionsForPeriod,
  setDistribution,
} from '../services/accounts'
import { listAccountTypes, createAccountType, deleteAccountType } from '../services/accountTypes'
import { listTransfersForPeriod, createTransfer, deleteTransfer } from '../services/transfers'
import { createIncome } from '../services/incomes'
import { listExchangeRates, createExchangeRate, deleteExchangeRate, getLatestRatesToDOP } from '../services/exchangeRates'
import { convertToDOP, estimateMonthlyInterest } from '../utils/finance'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { formatMoney } from '../utils/format'

const CURRENCIES = ['DOP', 'USD']

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
  const [accountTypes, setAccountTypes] = useState([])
  const [newAccountType, setNewAccountType] = useState('')
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank', currency: 'DOP', accountTypeId: '', annualInterestRate: '' })
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editAccountForm, setEditAccountForm] = useState({ name: '', type: 'bank', currency: 'DOP', accountTypeId: '', annualInterestRate: '' })
  const [accountError, setAccountError] = useState('')
  const [exchangeRatesList, setExchangeRatesList] = useState([])
  const [newRate, setNewRate] = useState({ fromCurrency: 'USD', rate: '', date: '' })
  const [transfers, setTransfers] = useState([])
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', note: '' })
  const [transferWarning, setTransferWarning] = useState(null)
  const [savingTransfer, setSavingTransfer] = useState(false)
  const [ratesToDOP, setRatesToDOP] = useState({})

  const load = async () => {
    const accs = await listAccounts(user.id)
    // el balance se calcula a partir de movimientos, así que primero se recalcula
    // (sana automáticamente cualquier dato histórico desactualizado)
    await Promise.all(accs.map((a) => recomputeAccountBalances(user.id, a.id)))
    const [bals, dists, seeds, trans, rates, types, rawRates] = await Promise.all([
      getAccountBalancesForPeriod(user.id, currentPeriod.id),
      getDistributionsForPeriod(user.id, currentPeriod.id),
      Promise.all(accs.map((a) => getAccountSeed(user.id, a.id))),
      listTransfersForPeriod(user.id, currentPeriod.id),
      getLatestRatesToDOP(user.id),
      listAccountTypes(user.id),
      listExchangeRates(user.id),
    ])
    setAccounts(accs)
    setBalances(Object.fromEntries(bals.map((b) => [b.account_id, b.balance])))
    setSeedByAccount(Object.fromEntries(accs.map((a, i) => [a.id, seeds[i]])))
    setDistributions(Object.fromEntries(dists.map((d) => [d.account_id, d.amount])))
    setAccountTypes(types)
    setExchangeRatesList(rawRates)
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

  // Nombre es lo único que identifica una cuenta para el usuario (no hay
  // campo de banco separado) — dos cuentas con el mismo nombre serían
  // indistinguibles en el resto de la app (balances, distribución, etc.).
  const isDuplicateAccountName = (name, excludeId = null) =>
    accounts.some((a) => a.id !== excludeId && a.name.trim().toLowerCase() === name.trim().toLowerCase())

  const handleAddAccount = async (e) => {
    e.preventDefault()
    setAccountError('')
    const name = newAccount.name.trim()
    if (!name) return
    if (isDuplicateAccountName(name)) {
      setAccountError(`Ya tienes una cuenta llamada "${name}". Usa un nombre distinto para diferenciarlas, ej. "${name} Ahorros" y "${name} Corriente".`)
      return
    }
    await createAccount(user.id, {
      ...newAccount,
      name,
      accountTypeId: newAccount.accountTypeId || null,
      annualInterestRate: newAccount.annualInterestRate ? Number(newAccount.annualInterestRate) : 0,
    })
    setNewAccount({ name: '', type: 'bank', currency: 'DOP', accountTypeId: '', annualInterestRate: '' })
    load()
  }

  const startEditAccount = (account) => {
    setAccountError('')
    setEditingAccountId(account.id)
    setEditAccountForm({
      name: account.name,
      type: account.type,
      currency: account.currency || 'DOP',
      accountTypeId: account.account_type_id || '',
      annualInterestRate: account.annual_interest_rate ?? '',
    })
  }
  const cancelEditAccount = () => { setEditingAccountId(null); setAccountError('') }
  const saveEditAccount = async (accountId) => {
    setAccountError('')
    const name = editAccountForm.name.trim()
    if (!name) return
    if (isDuplicateAccountName(name, accountId)) {
      setAccountError(`Ya tienes una cuenta llamada "${name}". Usa un nombre distinto.`)
      return
    }
    await updateAccount(accountId, {
      name,
      type: editAccountForm.type,
      currency: editAccountForm.currency,
      account_type_id: editAccountForm.accountTypeId || null,
      annual_interest_rate: Number(editAccountForm.annualInterestRate || 0),
    })
    setEditingAccountId(null)
    load()
  }

  const handleAddAccountType = async (e) => {
    e.preventDefault()
    if (!newAccountType.trim()) return
    await createAccountType(user.id, newAccountType.trim())
    setNewAccountType('')
    load()
  }

  const handleAddRate = async (e) => {
    e.preventDefault()
    if (!newRate.fromCurrency || !newRate.rate) return
    await createExchangeRate(user.id, {
      fromCurrency: newRate.fromCurrency,
      rate: Number(newRate.rate),
      date: newRate.date || undefined,
    })
    setNewRate({ fromCurrency: 'USD', rate: '', date: '' })
    load()
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

  const handleRegisterInterest = async (account, amount) => {
    await createIncome(user.id, currentPeriod.id, {
      type: 'other',
      source: `Interés — ${account.name}`,
      accountId: account.id,
      amount,
      description: 'Interés generado registrado desde Cuentas',
    })
    load()
  }

  const handleDistributionChange = (accountId, value) => {
    setDistributions((d) => ({ ...d, [accountId]: value }))
  }
  const handleDistributionBlur = async (accountId, value) => {
    if (value === '' || value === undefined) return
    await setDistribution(user.id, accountId, currentPeriod.id, Number(value))
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
        <CardHeader title="Tus cuentas" subtitle="Nombre, tipo, moneda e interés" icon={Landmark} />
        <ul className="divide-y divide-border mb-4">
          {accounts.map((a) =>
            editingAccountId === a.id ? (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Input
                  value={editAccountForm.name}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                  className="flex-1 min-w-[120px]"
                />
                <Select
                  value={editAccountForm.type}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, type: e.target.value })}
                  className="max-w-[130px]"
                >
                  <option value="bank">Banco</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </Select>
                <Select
                  value={editAccountForm.currency}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, currency: e.target.value })}
                  className="max-w-[90px]"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select
                  value={editAccountForm.accountTypeId}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, accountTypeId: e.target.value })}
                  className="max-w-[140px]"
                >
                  <option value="">Sin tipo específico</option>
                  {accountTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Interés anual %"
                  value={editAccountForm.annualInterestRate}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, annualInterestRate: e.target.value })}
                  className="max-w-[120px]"
                />
                <button onClick={() => saveEditAccount(a.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={cancelEditAccount} className="text-ink-faint hover:text-ink transition-colors shrink-0">
                  <X size={16} />
                </button>
              </li>
            ) : (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Landmark size={14} className="text-ink-faint" />
                  <span className="text-sm text-ink">{a.name}</span>
                  <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full capitalize">{a.account_types?.name || a.type}</span>
                  <span className="text-xs text-ink-faint bg-surface-sunken px-2 py-0.5 rounded-full">{a.currency || 'DOP'}</span>
                  {Number(a.annual_interest_rate) > 0 && (
                    <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{a.annual_interest_rate}% anual</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditAccount(a)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={async () => { await deactivateAccount(a.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
        {accountError && (
          <p className="text-alert text-xs mb-2">{accountError}</p>
        )}
        <form onSubmit={handleAddAccount} className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input
            placeholder="Nueva cuenta"
            value={newAccount.name}
            onChange={(e) => { setNewAccount({ ...newAccount, name: e.target.value }); setAccountError('') }}
          />
          <Select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}>
            <option value="bank">Banco</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
          <Select value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={newAccount.accountTypeId} onChange={(e) => setNewAccount({ ...newAccount, accountTypeId: e.target.value })}>
            <option value="">Sin tipo específico</option>
            {accountTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Input type="number" step="0.01" placeholder="Interés anual %" value={newAccount.annualInterestRate} onChange={(e) => setNewAccount({ ...newAccount, annualInterestRate: e.target.value })} />
            <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Tipos de cuenta" subtitle="Personalizados por ti — Ahorro, Corriente, Plazo Fijo/CDT, o lo que quieras" />
        <ul className="divide-y divide-border mb-4">
          {accountTypes.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink">{t.name}</span>
              <button onClick={async () => { await deleteAccountType(t.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {accountTypes.length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Sin tipos personalizados todavía.</li>
          )}
        </ul>
        <form onSubmit={handleAddAccountType} className="flex gap-2">
          <Input placeholder="Nuevo tipo (ej. Plazo Fijo/CDT)" value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} />
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Tasas de cambio" subtitle="Se usa siempre la más reciente por moneda" />
        <ul className="divide-y divide-border mb-4">
          {exchangeRatesList.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-ink">1 {r.from_currency} = {r.rate} {r.to_currency}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint">{r.date}</span>
                <button onClick={async () => { await deleteExchangeRate(r.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
          {exchangeRatesList.length === 0 && (
            <li className="py-2.5 text-sm text-ink-faint">Sin tasas registradas — cuentas en otra moneda no se podrán convertir hasta que agregues una.</li>
          )}
        </ul>
        <form onSubmit={handleAddRate} className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={newRate.fromCurrency} onChange={(e) => setNewRate({ ...newRate, fromCurrency: e.target.value })}>
            {CURRENCIES.filter((c) => c !== 'DOP').map((c) => <option key={c} value={c}>{c} → DOP</option>)}
          </Select>
          <Input type="number" step="0.0001" placeholder="Tasa (ej. 62.5)" value={newRate.rate} onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })} />
          <Input type="date" value={newRate.date} onChange={(e) => setNewRate({ ...newRate, date: e.target.value })} />
          <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
        </form>
      </Card>

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

                {Number(acc.annual_interest_rate) > 0 && (
                  <div className="mt-2 ml-[42px] flex items-center gap-3 text-xs">
                    <span className="text-ink-faint">
                      Interés estimado este período ({acc.annual_interest_rate}% anual): <span className="text-emerald-500 font-medium tabular">{formatMoney(estimateMonthlyInterest(balances[acc.id] ?? 0, acc.annual_interest_rate))}</span>
                    </span>
                    <button
                      onClick={() => handleRegisterInterest(acc, estimateMonthlyInterest(balances[acc.id] ?? 0, acc.annual_interest_rate))}
                      className="text-emerald-500 hover:text-emerald-400 transition-colors underline"
                    >
                      Registrar interés generado
                    </button>
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
