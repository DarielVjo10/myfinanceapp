import { useEffect, useState } from 'react'
import { Landmark, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePeriod } from '../contexts/PeriodContext'
import { listAccounts, getAccountBalancesForPeriod, setAccountBalance, getDistributionsForPeriod, setDistribution } from '../services/accounts'
import { listCreditCards, getCreditCardUsageForPeriod, setCreditCardBalance } from '../services/networth'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { formatMoney, formatPercent } from '../utils/format'

export default function Accounts() {
  const { user } = useAuth()
  const { currentPeriod } = usePeriod()
  const [accounts, setAccounts] = useState([])
  const [balances, setBalances] = useState({})
  const [distributions, setDistributions] = useState({})
  const [cards, setCards] = useState([])
  const [cardUsage, setCardUsage] = useState({})

  const load = async () => {
    const [accs, bals, dists, crds, usage] = await Promise.all([
      listAccounts(user.id),
      getAccountBalancesForPeriod(user.id, currentPeriod.id),
      getDistributionsForPeriod(user.id, currentPeriod.id),
      listCreditCards(user.id),
      getCreditCardUsageForPeriod(user.id, currentPeriod.id),
    ])
    setAccounts(accs)
    setBalances(Object.fromEntries(bals.map((b) => [b.account_id, b.balance])))
    setDistributions(Object.fromEntries(dists.map((d) => [d.account_id, d.amount])))
    setCards(crds)
    setCardUsage(Object.fromEntries(usage.map((u) => [u.card_id, u.balance])))
  }

  useEffect(() => {
    if (user && currentPeriod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPeriod])

  const handleBalanceChange = async (accountId, value) => {
    setBalances((b) => ({ ...b, [accountId]: value }))
  }
  const handleBalanceBlur = async (accountId, value) => {
    if (value === '' || value === undefined) return
    await setAccountBalance(user.id, accountId, currentPeriod.id, Number(value))
  }

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

  const totalBalance = Object.values(balances).reduce((s, v) => s + Number(v || 0), 0)
  const totalDistribution = Object.values(distributions).reduce((s, v) => s + Number(v || 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-semibold text-xl text-ink">Cuentas</h1>
        <p className="text-ink-muted text-sm tabular">Balance total del mes: {formatMoney(totalBalance)}</p>
      </div>

      <Card>
        <CardHeader title="Balances por cuenta" subtitle="Se guarda como snapshot histórico de este mes" />
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Landmark size={16} className="text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-ink">{acc.name}</span>
              </div>
              <Input
                type="number"
                step="0.01"
                className="max-w-[160px] text-right tabular"
                value={balances[acc.id] ?? ''}
                onChange={(e) => handleBalanceChange(acc.id, e.target.value)}
                onBlur={(e) => handleBalanceBlur(acc.id, e.target.value)}
                placeholder="0.00"
              />
            </div>
          ))}
        </div>
      </Card>

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
    </div>
  )
}
