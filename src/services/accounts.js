import { supabase } from '../lib/supabaseClient'

export async function listAccounts(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createAccount(userId, { name, type = 'bank', color, icon, currency = 'DOP' }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name, type, color, icon, currency })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAccount(accountId, patch) {
  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', accountId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateAccount(accountId) {
  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', accountId)
  if (error) throw error
}

/** Balances de todas las cuentas para un período (histórico, no se sobrescribe entre meses) */
export async function getAccountBalancesForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*, accounts(name, type, color, icon, currency)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}

/** Upsert de balance declarado a mano por el usuario: un registro único por cuenta+período */
export async function setAccountBalance(userId, accountId, periodId, balance) {
  const { data, error } = await supabase
    .from('account_balances')
    .upsert(
      { user_id: userId, account_id: accountId, period_id: periodId, balance, is_declared: true },
      { onConflict: 'account_id,period_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Histórico de balances de una cuenta específica, para graficar evolución */
export async function getAccountBalanceHistory(userId, accountId) {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*, monthly_periods(year, month)')
    .eq('user_id', userId)
    .eq('account_id', accountId)
  if (error) throw error
  return data
}

// ------------ Ledger: balance calculado a partir de movimientos históricos ------------

async function fetchOrderedPeriods(userId) {
  const { data, error } = await supabase
    .from('monthly_periods')
    .select('id, year, month')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true })
  if (error) throw error
  return data
}

/** El registro de account_balances más antiguo REALMENTE declarado por el usuario = "balance inicial declarado" */
async function fetchSeed(userId, accountId) {
  const { data, error } = await supabase
    .from('account_balances')
    .select('period_id, balance, monthly_periods(year, month)')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('is_declared', true)
  if (error) throw error
  const sorted = (data ?? [])
    .filter((r) => r.monthly_periods)
    .sort((a, b) => a.monthly_periods.year - b.monthly_periods.year || a.monthly_periods.month - b.monthly_periods.month)
  return sorted[0] ?? null
}

export async function getAccountSeed(userId, accountId) {
  return fetchSeed(userId, accountId)
}

async function fetchAccountMovements(userId, accountId) {
  const [
    { data: incomes, error: e1 },
    { data: expenses, error: e2 },
    { data: contributions, error: e3 },
    { data: transfersOut, error: e4 },
    { data: transfersIn, error: e5 },
  ] = await Promise.all([
    supabase.from('incomes').select('amount, period_id').eq('user_id', userId).eq('account_id', accountId),
    supabase.from('expenses').select('amount, period_id').eq('user_id', userId).eq('account_id', accountId),
    supabase.from('savings_contributions').select('amount, period_id').eq('user_id', userId).eq('account_id', accountId),
    supabase.from('account_transfers').select('amount, period_id').eq('user_id', userId).eq('from_account_id', accountId),
    supabase.from('account_transfers').select('amount, period_id').eq('user_id', userId).eq('to_account_id', accountId),
  ])
  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3
  if (e4) throw e4
  if (e5) throw e5
  return {
    incomes: incomes ?? [],
    expenses: expenses ?? [],
    contributions: contributions ?? [],
    transfersOut: transfersOut ?? [],
    transfersIn: transfersIn ?? [],
  }
}

function buildNetByPeriod({ incomes, expenses, contributions, transfersOut, transfersIn }) {
  const net = {}
  const add = (rows, sign) => {
    for (const r of rows) net[r.period_id] = (net[r.period_id] ?? 0) + sign * Number(r.amount)
  }
  add(incomes, 1)
  add(expenses, -1)
  add(contributions, -1)
  add(transfersOut, -1)
  add(transfersIn, 1)
  return net
}

const periodKey = (p) => p.year * 12 + p.month

/**
 * Balance de una cuenta en un período dado = saldo inicial declarado (si existe)
 * + movimientos netos (ingresos - gastos - ahorros) desde ese punto hasta el período pedido.
 * Nunca sobrescribe nada: solo lee y calcula.
 */
export async function computeAccountBalance(userId, accountId, upToPeriodId) {
  const periods = await fetchOrderedPeriods(userId)
  const upToIdx = periods.findIndex((p) => p.id === upToPeriodId)
  if (upToIdx === -1) return { balance: 0, seedPeriodId: null }

  const seedRow = await fetchSeed(userId, accountId)
  const netByPeriod = buildNetByPeriod(await fetchAccountMovements(userId, accountId))
  const upToKey = periodKey(periods[upToIdx])

  if (!seedRow) {
    let running = 0
    for (let i = 0; i <= upToIdx; i++) running += netByPeriod[periods[i].id] ?? 0
    return { balance: running, seedPeriodId: null }
  }

  const seedKey = periodKey(seedRow.monthly_periods)
  if (upToKey < seedKey) {
    let running = 0
    for (let i = 0; i <= upToIdx; i++) running += netByPeriod[periods[i].id] ?? 0
    return { balance: running, seedPeriodId: seedRow.period_id }
  }

  let running = Number(seedRow.balance)
  for (const p of periods) {
    const key = periodKey(p)
    if (key <= seedKey) continue
    if (key > upToKey) break
    running += netByPeriod[p.id] ?? 0
  }
  return { balance: running, seedPeriodId: seedRow.period_id }
}

/** Ingresos, gastos, ahorros y transferencias de esta cuenta en un período específico (no acumulado) */
export async function getAccountMovementBreakdown(userId, accountId, periodId) {
  const [
    { data: incomes, error: e1 },
    { data: expenses, error: e2 },
    { data: contributions, error: e3 },
    { data: transfersOut, error: e4 },
    { data: transfersIn, error: e5 },
  ] = await Promise.all([
    supabase.from('incomes').select('amount').eq('user_id', userId).eq('account_id', accountId).eq('period_id', periodId),
    supabase.from('expenses').select('amount').eq('user_id', userId).eq('account_id', accountId).eq('period_id', periodId),
    supabase.from('savings_contributions').select('amount').eq('user_id', userId).eq('account_id', accountId).eq('period_id', periodId),
    supabase.from('account_transfers').select('amount').eq('user_id', userId).eq('from_account_id', accountId).eq('period_id', periodId),
    supabase.from('account_transfers').select('amount').eq('user_id', userId).eq('to_account_id', accountId).eq('period_id', periodId),
  ])
  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3
  if (e4) throw e4
  if (e5) throw e5
  const sum = (rows) => (rows ?? []).reduce((s, r) => s + Number(r.amount), 0)
  return {
    income: sum(incomes),
    expenses: sum(expenses),
    savings: sum(contributions),
    transfersOut: sum(transfersOut),
    transfersIn: sum(transfersIn),
  }
}

/**
 * Recalcula y persiste (upsert) el balance de la cuenta para TODOS los períodos
 * existentes del usuario, a partir del saldo inicial declarado + movimientos.
 * Escribir en account_balances es lo que mantiene vivo el trigger de patrimonio
 * neto en Supabase — no se duplica esa lógica aquí, solo se alimenta.
 */
export async function recomputeAccountBalances(userId, accountId) {
  const periods = await fetchOrderedPeriods(userId)
  if (periods.length === 0) return

  const seedRow = await fetchSeed(userId, accountId)
  const netByPeriod = buildNetByPeriod(await fetchAccountMovements(userId, accountId))
  const seedKey = seedRow ? periodKey(seedRow.monthly_periods) : null

  let running = 0
  const rows = []
  for (const p of periods) {
    const key = periodKey(p)
    if (seedRow && key === seedKey) {
      running = Number(seedRow.balance)
      rows.push({ user_id: userId, account_id: accountId, period_id: p.id, balance: running, is_declared: true })
      continue
    }
    if (seedRow && key < seedKey) continue
    running += netByPeriod[p.id] ?? 0
    rows.push({ user_id: userId, account_id: accountId, period_id: p.id, balance: running, is_declared: false })
  }
  if (rows.length === 0) return

  const { error } = await supabase
    .from('account_balances')
    .upsert(rows, { onConflict: 'account_id,period_id' })
  if (error) throw error
}

// ------------ Distribución planificada por cuenta (sección "Distribución") ------------
export async function getDistributionsForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('account_distributions')
    .select('*, accounts(name)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}

export async function setDistribution(userId, accountId, periodId, amount) {
  const { data, error } = await supabase
    .from('account_distributions')
    .upsert(
      { user_id: userId, account_id: accountId, period_id: periodId, amount },
      { onConflict: 'account_id,period_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}
