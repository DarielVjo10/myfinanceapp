import { supabase } from '../lib/supabaseClient'

export async function listGoals(userId) {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createGoal(userId, { name, targetAmount, icon, color }) {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({ user_id: userId, name, target_amount: targetAmount, icon, color })
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

/** Aporte a una meta: SIEMPRE un movimiento nuevo, nunca sobrescribe el anterior */
export async function addContribution(userId, goalId, periodId, { amount, note, contributionDate }) {
  const { data, error } = await supabase
    .from('savings_contributions')
    .insert({
      user_id: userId,
      goal_id: goalId,
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

export async function deleteContribution(contributionId) {
  const { error } = await supabase.from('savings_contributions').delete().eq('id', contributionId)
  if (error) throw error
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
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*, savings_goals(name, color, icon)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('contribution_date', { ascending: false })
  if (error) throw error
  return data
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
