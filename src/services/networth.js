import { supabase } from '../lib/supabaseClient'

/** El trigger recalc_net_worth ya mantiene esta tabla actualizada automáticamente */
export async function getNetWorthForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .maybeSingle()
  if (error) throw error
  return data ?? { total_assets: 0, total_liabilities: 0, net_worth: 0 }
}

/** Histórico de patrimonio para graficar la evolución (Line chart) */
export async function getNetWorthHistory(userId) {
  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .select('*, monthly_periods(year, month)')
    .eq('user_id', userId)
  if (error) throw error
  return data
    .filter((r) => r.monthly_periods)
    .sort((a, b) => {
      if (a.monthly_periods.year !== b.monthly_periods.year)
        return a.monthly_periods.year - b.monthly_periods.year
      return a.monthly_periods.month - b.monthly_periods.month
    })
}

// ------------------------- Tarjetas de crédito -------------------------
export async function listCreditCards(userId) {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) throw error
  return data
}

export async function setCreditCardBalance(userId, cardId, periodId, balance) {
  const { data, error } = await supabase
    .from('credit_card_balances')
    .upsert(
      { user_id: userId, card_id: cardId, period_id: periodId, balance },
      { onConflict: 'card_id,period_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCreditCardUsageForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('credit_card_balances')
    .select('*, credit_cards(name, credit_limit)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}
