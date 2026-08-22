import { supabase } from '../lib/supabaseClient'

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
  return data
}

export async function deleteIncome(incomeId) {
  const { error } = await supabase.from('incomes').delete().eq('id', incomeId)
  if (error) throw error
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
