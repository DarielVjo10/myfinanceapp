import { supabase } from '../lib/supabaseClient'
import { recomputeAccountBalances } from './accounts'
import { monthShort } from '../utils/format'

export async function listIncomes(userId, periodId) {
  const { data, error } = await supabase
    .from('incomes')
    .select('*, accounts(name)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('income_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createIncome(userId, periodId, { type = 'fixed', source, accountId, amount, description, incomeDate }) {
  const { data, error } = await supabase
    .from('incomes')
    .insert({
      user_id: userId,
      period_id: periodId,
      type,
      source,
      account_id: accountId,
      amount,
      description,
      income_date: incomeDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  if (data.account_id) await recomputeAccountBalances(userId, data.account_id)
  return data
}

export async function updateIncome(incomeId, patch) {
  const { data, error } = await supabase
    .from('incomes')
    .update(patch)
    .eq('id', incomeId)
    .select()
    .single()
  if (error) throw error
  if (data.account_id) await recomputeAccountBalances(data.user_id, data.account_id)
  return data
}

export async function deleteIncome(incomeId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from('incomes')
    .select('account_id')
    .eq('id', incomeId)
    .single()
  if (selectError) throw selectError
  const { error } = await supabase.from('incomes').delete().eq('id', incomeId)
  if (error) throw error
  if (existing?.account_id) await recomputeAccountBalances(userId, existing.account_id)
}

export async function totalIncomeForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('incomes')
    .select('amount')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data.reduce((sum, i) => sum + Number(i.amount), 0)
}

/** Evolución de un tipo de ingreso (fixed/extra/other) a través de varios períodos */
export async function incomeTrend(userId, type, periodIds) {
  const { data, error } = await supabase
    .from('incomes')
    .select('amount, period_id')
    .eq('user_id', userId)
    .eq('type', type)
    .in('period_id', periodIds)
  if (error) throw error

  const totals = {}
  for (const pid of periodIds) totals[pid] = 0
  for (const row of data) totals[row.period_id] += Number(row.amount)
  return totals
}

/** Igual que incomeTrend, pero como serie ordenada [{label, total}] lista para graficar */
export async function incomeTrendSeries(userId, type, periods, lang = 'es') {
  const totals = await incomeTrend(userId, type, periods.map((p) => p.id))
  return [...periods]
    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
    .map((p) => ({ label: monthShort(p.year, p.month, lang), total: totals[p.id] ?? 0 }))
}
