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

export async function createAccount(userId, { name, type = 'bank', color, icon }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: userId, name, type, color, icon })
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
    .select('*, accounts(name, type, color, icon)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}

/** Upsert de balance: un registro único por cuenta+período */
export async function setAccountBalance(userId, accountId, periodId, balance) {
  const { data, error } = await supabase
    .from('account_balances')
    .upsert(
      { user_id: userId, account_id: accountId, period_id: periodId, balance },
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
