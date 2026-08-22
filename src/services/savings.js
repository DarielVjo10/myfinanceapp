import { supabase } from '../lib/supabaseClient'
import { recomputeAccountBalances } from './accounts'
import { logEntityClosure } from './closures'

export async function listGoals(userId) {
  // el join con accounts depende de savings_goals.account_id (migración 017)
  // — si todavía no corrió, cae a la consulta plana en vez de romper
  // Dashboard.jsx/Savings.jsx enteros.
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*, accounts(name, annual_interest_rate)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (!error) return data

  const { data: fallback, error: fallbackError } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (fallbackError) throw fallbackError
  return fallback
}

export async function createGoal(userId, { name, targetAmount, icon, color, currency = 'DOP', targetDate, plannedMonthlyContribution, isEmergencyFund = false, accountId }) {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: userId,
      name,
      target_amount: targetAmount,
      icon,
      color,
      currency,
      target_date: targetDate || null,
      planned_monthly_contribution: plannedMonthlyContribution || null,
      is_emergency_fund: isEmergencyFund,
      account_id: accountId || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGoal(goalId, patch) {
  const { data, error } = await supabase
    .from('savings_goals')
    .update(patch)
    .eq('id', goalId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateGoal(goalId) {
  const { error } = await supabase
    .from('savings_goals')
    .update({ is_active: false })
    .eq('id', goalId)
  if (error) throw error
}

/**
 * Cierra una meta con saldo > 0: documenta a dónde va el dinero antes de
 * archivarla (ver migración 018 / ArchiveEntityModal). "Transferir" mueve
 * el 100% de los aportes históricos a la meta destino (se cierra completa,
 * no parcial) — el saldo de la destino sube automáticamente porque su
 * balance se calcula sumando savings_contributions.
 */
export async function closeGoal(userId, goalId, { resolution, targetGoalId, amount, note }) {
  if (resolution === 'transferred') {
    const { error } = await supabase
      .from('savings_contributions')
      .update({ goal_id: targetGoalId })
      .eq('goal_id', goalId)
      .eq('user_id', userId)
    if (error) throw error
  }

  await logEntityClosure(userId, {
    entityType: 'savings_goal',
    entityId: goalId,
    resolution,
    targetEntityId: targetGoalId,
    amount,
    note,
  })

  const { error } = await supabase
    .from('savings_goals')
    .update({
      is_active: false,
      closed_at: new Date().toISOString(),
      closure_reason: resolution,
      closure_note: note || null,
    })
    .eq('id', goalId)
  if (error) throw error
}

/** Aporte a una meta: SIEMPRE un movimiento nuevo, nunca sobrescribe el anterior */
export async function addContribution(userId, goalId, periodId, { amount, note, contributionDate, accountId, contributionType = 'planned' }) {
  const { data, error } = await supabase
    .from('savings_contributions')
    .insert({
      user_id: userId,
      goal_id: goalId,
      period_id: periodId,
      amount,
      note,
      account_id: accountId || null,
      contribution_type: contributionType,
      contribution_date: contributionDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  if (data.account_id) await recomputeAccountBalances(userId, data.account_id)
  return data
}

export async function deleteContribution(contributionId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from('savings_contributions')
    .select('account_id')
    .eq('id', contributionId)
    .single()
  if (selectError) throw selectError
  const { error } = await supabase.from('savings_contributions').delete().eq('id', contributionId)
  if (error) throw error
  if (existing?.account_id) await recomputeAccountBalances(userId, existing.account_id)
}

/** El balance de una meta se calcula SUMANDO todos sus aportes históricos */
export async function getGoalBalance(userId, goalId) {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('amount')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
  if (error) throw error
  return data.reduce((sum, c) => sum + Number(c.amount), 0)
}

/** Todas las metas con su balance acumulado (para el dashboard de ahorros) */
export async function listGoalsWithBalances(userId) {
  const goals = await listGoals(userId)
  const { data: contributions, error } = await supabase
    .from('savings_contributions')
    .select('goal_id, amount')
    .eq('user_id', userId)
  if (error) throw error

  return goals.map((goal) => {
    const total = contributions
      .filter((c) => c.goal_id === goal.id)
      .reduce((sum, c) => sum + Number(c.amount), 0)
    return { ...goal, balance: total }
  })
}

export async function contributionsForPeriod(userId, periodId) {
  // closed_at depende de la migración 018 — si todavía no corrió, cae a la
  // consulta sin esa columna en vez de romper Savings.jsx (mismo patrón que
  // listGoals con account_id/migración 017).
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*, savings_goals(name, color, icon, closed_at)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('contribution_date', { ascending: false })
  if (!error) return data

  const { data: fallback, error: fallbackError } = await supabase
    .from('savings_contributions')
    .select('*, savings_goals(name, color, icon)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('contribution_date', { ascending: false })
  if (fallbackError) throw fallbackError
  return fallback
}

export async function totalSavingsForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('amount')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data.reduce((sum, c) => sum + Number(c.amount), 0)
}
