import { supabase } from '../lib/supabaseClient'
import { logEntityClosure } from './closures'

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

export async function createCreditCard(userId, { name, creditLimit, cutoffDay, dueDay, annualInterestRate, minimumPaymentPct }) {
  const { data, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: userId,
      name,
      credit_limit: creditLimit,
      cutoff_day: cutoffDay || null,
      due_day: dueDay || null,
      annual_interest_rate: annualInterestRate ?? 0,
      minimum_payment_pct: minimumPaymentPct ?? 5,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCreditCard(cardId, patch) {
  const { data, error } = await supabase
    .from('credit_cards')
    .update(patch)
    .eq('id', cardId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateCreditCard(cardId) {
  const { error } = await supabase
    .from('credit_cards')
    .update({ is_active: false })
    .eq('id', cardId)
  if (error) throw error
}

/**
 * Cierra una tarjeta con saldo (deuda) > 0 (ver migración 018 /
 * ArchiveEntityModal). No existe una "credit_card_transfers" dedicada, así
 * que "transferir" ajusta manualmente el balance del período actual de la
 * tarjeta destino sumando la deuda movida.
 */
export async function closeCreditCard(userId, periodId, cardId, { resolution, targetCardId, amount, note }) {
  if (resolution === 'transferred') {
    const { data: existing, error: existingError } = await supabase
      .from('credit_card_balances')
      .select('balance')
      .eq('card_id', targetCardId)
      .eq('period_id', periodId)
      .maybeSingle()
    if (existingError) throw existingError
    const newBalance = Number(existing?.balance || 0) + Number(amount)
    const { error } = await supabase
      .from('credit_card_balances')
      .upsert(
        { user_id: userId, card_id: targetCardId, period_id: periodId, balance: newBalance },
        { onConflict: 'card_id,period_id' }
      )
    if (error) throw error
  }

  await logEntityClosure(userId, {
    entityType: 'credit_card',
    entityId: cardId,
    resolution,
    targetEntityId: targetCardId,
    amount,
    note,
  })

  const { error } = await supabase
    .from('credit_cards')
    .update({
      is_active: false,
      closed_at: new Date().toISOString(),
      closure_reason: resolution,
      closure_note: note || null,
    })
    .eq('id', cardId)
  if (error) throw error
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

/** ¿Pagó completo la tarjeta el período anterior? null = no indicado todavía */
export async function setCardPaidInFull(userId, cardId, periodId, paidInFull) {
  const { data, error } = await supabase
    .from('credit_card_balances')
    .upsert(
      { user_id: userId, card_id: cardId, period_id: periodId, paid_in_full: paidInFull },
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
    .select('*, credit_cards(name, credit_limit, cutoff_day, due_day, annual_interest_rate, minimum_payment_pct)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}
