import { useEffect, useState } from 'react'
import { CreditCard as CreditCardIcon, Plus, Trash2, AlertTriangle, Pencil, X, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import {
  listCreditCards,
  createCreditCard,
  updateCreditCard,
  deactivateCreditCard,
  getCreditCardUsageForPeriod,
  setCreditCardBalance,
  setCardPaidInFull,
} from '../services/networth'
import { listDebts, createDebt, updateDebt, deactivateDebt } from '../services/debts'
import { projectDebtPayoff, estimateMonthlyInterest, estimateMinimumPayment } from '../utils/finance'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { formatMoney, formatPercent } from '../utils/format'

export default function CreditCards() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [cards, setCards] = useState([])
  const [cardUsage, setCardUsage] = useState({})
  const [cardPaidInFullMap, setCardPaidInFullMap] = useState({})
  const [newCard, setNewCard] = useState({ name: '', creditLimit: '', cutoffDay: '', dueDay: '', annualInterestRate: '', minimumPaymentPct: '5' })
  const [editingCardId, setEditingCardId] = useState(null)
  const [editCardForm, setEditCardForm] = useState({ name: '', creditLimit: '', cutoffDay: '', dueDay: '', annualInterestRate: '', minimumPaymentPct: '' })
  const [debts, setDebts] = useState([])
  const [newDebt, setNewDebt] = useState({ name: '', balance: '', interestRate: '', minimumPayment: '', dueDate: '' })
  const [editingDebtId, setEditingDebtId] = useState(null)
  const [editDebtForm, setEditDebtForm] = useState({ name: '', balance: '', interestRate: '', minimumPayment: '', dueDate: '' })
  const [simPayment, setSimPayment] = useState({})

  const load = async () => {
    const [crds, usage, dbts] = await Promise.all([
      listCreditCards(user.id),
      getCreditCardUsageForPeriod(user.id, currentPeriod.id),
      listDebts(user.id),
    ])
    setCards(crds)
    setCardUsage(Object.fromEntries(usage.map((u) => [u.card_id, u.balance])))
    setCardPaidInFullMap(Object.fromEntries(usage.map((u) => [u.card_id, u.paid_in_full])))
    setDebts(dbts)
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const handleCardUsageBlur = async (cardId, value) => {
    if (value === '' || value === undefined) return
    await setCreditCardBalance(user.id, cardId, currentPeriod.id, Number(value))
    load()
  }

  const handleCardPaidInFullChange = async (cardId, paidInFull) => {
    setCardPaidInFullMap((m) => ({ ...m, [cardId]: paidInFull }))
    await setCardPaidInFull(user.id, cardId, currentPeriod.id, paidInFull)
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!newCard.name.trim() || newCard.creditLimit === '') return
    await createCreditCard(user.id, {
      name: newCard.name,
      creditLimit: Number(newCard.creditLimit),
      cutoffDay: newCard.cutoffDay ? Number(newCard.cutoffDay) : null,
      dueDay: newCard.dueDay ? Number(newCard.dueDay) : null,
      annualInterestRate: newCard.annualInterestRate ? Number(newCard.annualInterestRate) : 0,
      minimumPaymentPct: newCard.minimumPaymentPct ? Number(newCard.minimumPaymentPct) : 5,
    })
    setNewCard({ name: '', creditLimit: '', cutoffDay: '', dueDay: '', annualInterestRate: '', minimumPaymentPct: '5' })
    load()
  }

  const startEditCard = (card) => {
    setEditingCardId(card.id)
    setEditCardForm({
      name: card.name,
      creditLimit: card.credit_limit,
      cutoffDay: card.cutoff_day ?? '',
      dueDay: card.due_day ?? '',
      annualInterestRate: card.annual_interest_rate ?? 0,
      minimumPaymentPct: card.minimum_payment_pct ?? 5,
    })
  }
  const cancelEditCard = () => setEditingCardId(null)
  const saveEditCard = async (cardId) => {
    if (!editCardForm.name.trim()) return
    await updateCreditCard(cardId, {
      name: editCardForm.name,
      credit_limit: Number(editCardForm.creditLimit),
      cutoff_day: editCardForm.cutoffDay ? Number(editCardForm.cutoffDay) : null,
      due_day: editCardForm.dueDay ? Number(editCardForm.dueDay) : null,
      annual_interest_rate: Number(editCardForm.annualInterestRate || 0),
      minimum_payment_pct: Number(editCardForm.minimumPaymentPct || 5),
    })
    setEditingCardId(null)
    load()
  }

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-semibold text-xl text-ink">Tarjetas de crédito y deudas</h1>
        <p className="text-ink-muted text-sm tabular">Lo que debes — no cuenta como balance disponible en tus cuentas</p>
      </div>

      <Card>
        <CardHeader title="Tarjetas de crédito" subtitle="Uso del mes vs límite" icon={CreditCardIcon} />
        <div className="space-y-5">
          {cards.map((card) => {
            if (editingCardId === card.id) {
              return (
                <div key={card.id} className="space-y-2 border border-border rounded-lg p-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Input placeholder="Nombre" value={editCardForm.name} onChange={(e) => setEditCardForm({ ...editCardForm, name: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Límite" value={editCardForm.creditLimit} onChange={(e) => setEditCardForm({ ...editCardForm, creditLimit: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="Tasa anual %" value={editCardForm.annualInterestRate} onChange={(e) => setEditCardForm({ ...editCardForm, annualInterestRate: e.target.value })} />
                    <Input type="number" min="1" max="31" placeholder="Día de corte" value={editCardForm.cutoffDay} onChange={(e) => setEditCardForm({ ...editCardForm, cutoffDay: e.target.value })} />
                    <Input type="number" min="1" max="31" placeholder="Día límite pago" value={editCardForm.dueDay} onChange={(e) => setEditCardForm({ ...editCardForm, dueDay: e.target.value })} />
                    <Input type="number" step="0.01" placeholder="% pago mínimo" value={editCardForm.minimumPaymentPct} onChange={(e) => setEditCardForm({ ...editCardForm, minimumPaymentPct: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEditCard(card.id)} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEditCard} className="text-ink-faint hover:text-ink transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )
            }

            const usage = Number(cardUsage[card.id] ?? 0)
            const pct = card.credit_limit > 0 ? (usage / card.credit_limit) * 100 : 0
            const paidInFull = cardPaidInFullMap[card.id]
            const minPayment = estimateMinimumPayment(usage, card.minimum_payment_pct ?? 5)
            const interest = estimateMonthlyInterest(usage, card.annual_interest_rate ?? 0)
            return (
              <div key={card.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{card.name}</span>
                    <button onClick={() => startEditCard(card)} className="text-ink-faint hover:text-emerald-500 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={async () => { await deactivateCreditCard(card.id); load() }} className="text-ink-faint hover:text-alert transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
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
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-alert' : pct > 50 ? 'bg-warn' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-ink-faint mt-1">
                  {formatPercent(pct, 0)} de {formatMoney(card.credit_limit)}
                  {' · '}pago mínimo estimado: {formatMoney(minPayment)}
                  {(card.cutoff_day || card.due_day) && ' · '}
                  {card.cutoff_day && `corte día ${card.cutoff_day}`}
                  {card.cutoff_day && card.due_day && ' · '}
                  {card.due_day && `pago límite día ${card.due_day}`}
                </p>
                {pct >= 80 && (
                  <p className="flex items-center gap-1.5 text-xs text-alert mt-1.5">
                    <AlertTriangle size={13} className="shrink-0" />
                    Estás usando {formatPercent(pct, 0)} del límite de esta tarjeta — considera pagar más de lo mínimo para no seguir subiendo el uso.
                  </p>
                )}
                {usage > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <label className="flex items-center gap-1.5 text-ink-muted">
                      <input
                        type="checkbox"
                        checked={paidInFull === true}
                        onChange={(e) => handleCardPaidInFullChange(card.id, e.target.checked)}
                      />
                      Pagué completo el mes pasado
                    </label>
                    {paidInFull === false && (
                      <span className="text-alert">
                        Interés estimado de este mes si no pagas completo: {formatMoney(interest)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {cards.length === 0 && (
            <p className="text-sm text-ink-faint">Sin tarjetas de crédito registradas.</p>
          )}
        </div>
        <form onSubmit={handleAddCard} className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <Input placeholder="Nombre" value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Límite" value={newCard.creditLimit} onChange={(e) => setNewCard({ ...newCard, creditLimit: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Tasa anual %" value={newCard.annualInterestRate} onChange={(e) => setNewCard({ ...newCard, annualInterestRate: e.target.value })} />
          <Input type="number" min="1" max="31" placeholder="Día de corte" value={newCard.cutoffDay} onChange={(e) => setNewCard({ ...newCard, cutoffDay: e.target.value })} />
          <Input type="number" min="1" max="31" placeholder="Día límite pago" value={newCard.dueDay} onChange={(e) => setNewCard({ ...newCard, dueDay: e.target.value })} />
          <div className="flex gap-2">
            <Input type="number" step="0.01" placeholder="% pago mínimo" value={newCard.minimumPaymentPct} onChange={(e) => setNewCard({ ...newCard, minimumPaymentPct: e.target.value })} />
            <Button type="submit" className="shrink-0"><Plus size={16} /></Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Deudas"
          subtitle="Balance actual, no por período — se edita en el momento"
          icon={CreditCardIcon}
          action={
            debts.length > 0 && (
              <span className="tabular text-sm font-medium text-ink-muted">Total: {formatMoney(totalActiveDebts)}</span>
            )
          }
        />

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
                    <CreditCardIcon size={14} className="text-ink-faint" />
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
    </div>
  )
}
