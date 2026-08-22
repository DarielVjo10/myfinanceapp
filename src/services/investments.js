import { supabase } from '../lib/supabaseClient'
import { logEntityClosure } from './closures'

export async function listInvestments(userId) {
  const { data, error } = await supabase
    .from('investment_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createInvestment(userId, { name, investmentType, expectedAnnualReturn }) {
  const { data, error } = await supabase
    .from('investment_accounts')
    .insert({
      user_id: userId,
      name,
      investment_type: investmentType || null,
      expected_annual_return: expectedAnnualReturn === '' || expectedAnnualReturn == null ? null : Number(expectedAnnualReturn),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInvestment(investmentId, patch) {
  const { data, error } = await supabase
    .from('investment_accounts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', investmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateInvestment(investmentId) {
  const { error } = await supabase
    .from('investment_accounts')
    .update({ is_active: false })
    .eq('id', investmentId)
  if (error) throw error
}

/**
 * Cierra una inversión con valor > 0 (ver migración 018 /
 * ArchiveEntityModal). El "saldo" de una inversión es su última valuación
 * declarada, no la suma de aportes — "transferir" registra un aporte en la
 * destino por ese monto, documentando el valor movido (no es lo mismo que
 * un aporte real nuevo, pero mantiene la trazabilidad en el mismo lugar
 * donde ya se ven los aportes de esa inversión).
 */
export async function closeInvestment(userId, periodId, investmentId, { resolution, targetInvestmentId, amount, note }) {
  if (resolution === 'transferred') {
    const { error } = await supabase.from('investment_contributions').insert({
      user_id: userId,
      investment_id: targetInvestmentId,
      period_id: periodId,
      amount,
      note: note || 'Cierre de inversión — valor transferido',
      contribution_date: new Date().toISOString().slice(0, 10),
    })
    if (error) throw error
  }

  await logEntityClosure(userId, {
    entityType: 'investment_account',
    entityId: investmentId,
    resolution,
    targetEntityId: targetInvestmentId,
    amount,
    note,
  })

  const { error } = await supabase
    .from('investment_accounts')
    .update({
      is_active: false,
      closed_at: new Date().toISOString(),
      closure_reason: resolution,
      closure_note: note || null,
    })
    .eq('id', investmentId)
  if (error) throw error
}

/** Aporte a una inversión: SIEMPRE un movimiento nuevo, nunca sobrescribe el anterior */
export async function addInvestmentContribution(userId, investmentId, periodId, { amount, note, contributionDate }) {
  const { data, error } = await supabase
    .from('investment_contributions')
    .insert({
      user_id: userId,
      investment_id: investmentId,
      period_id: periodId,
      amount,
      note,
      contribution_date: contributionDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInvestmentContribution(contributionId) {
  const { error } = await supabase.from('investment_contributions').delete().eq('id', contributionId)
  if (error) throw error
}

export async function getTotalContributed(userId, investmentId) {
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('amount')
    .eq('user_id', userId)
    .eq('investment_id', investmentId)
  if (error) throw error
  return (data ?? []).reduce((s, c) => s + Number(c.amount), 0)
}

export async function contributionsForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('*, investment_accounts(name)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('contribution_date', { ascending: false })
  if (error) throw error
  return data
}

/** Valor actual = última valuación registrada (no se calcula, la declara el usuario) */
export async function setValuation(userId, investmentId, periodId, value) {
  const { data, error } = await supabase
    .from('investment_valuations')
    .upsert(
      { user_id: userId, investment_id: investmentId, period_id: periodId, value, valuation_date: new Date().toISOString().slice(0, 10) },
      { onConflict: 'investment_id,period_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getLatestValuation(userId, investmentId) {
  const { data, error } = await supabase
    .from('investment_valuations')
    .select('value, valuation_date, period_id, monthly_periods(year, month)')
    .eq('user_id', userId)
    .eq('investment_id', investmentId)
  if (error) throw error
  const sorted = (data ?? [])
    .filter((r) => r.monthly_periods)
    .sort((a, b) => a.monthly_periods.year - b.monthly_periods.year || a.monthly_periods.month - b.monthly_periods.month)
  return sorted.at(-1) ?? null
}

/** Histórico de valuaciones ordenado cronológicamente, para graficar evolución */
export async function getValuationHistory(userId, investmentId) {
  const { data, error } = await supabase
    .from('investment_valuations')
    .select('value, period_id, monthly_periods(year, month)')
    .eq('user_id', userId)
    .eq('investment_id', investmentId)
  if (error) throw error
  return (data ?? [])
    .filter((r) => r.monthly_periods)
    .sort((a, b) => a.monthly_periods.year - b.monthly_periods.year || a.monthly_periods.month - b.monthly_periods.month)
}
