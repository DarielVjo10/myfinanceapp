import { supabase } from '../lib/supabaseClient'
import { recomputeAccountBalances } from './accounts'

export async function listExpenses(userId, periodId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_categories(name, classification, color, icon), accounts(name)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('expense_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createExpense(userId, periodId, { categoryId, accountId, amount, description, expenseDate, templateId }) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      period_id: periodId,
      category_id: categoryId,
      account_id: accountId,
      amount,
      description,
      expense_date: expenseDate || new Date().toISOString().slice(0, 10),
      template_id: templateId || null,
    })
    .select()
    .single()
  if (error) throw error
  if (data.account_id) await recomputeAccountBalances(userId, data.account_id)
  return data
}

export async function updateExpense(expenseId, patch) {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', expenseId)
    .select()
    .single()
  if (error) throw error
  if (data.account_id) await recomputeAccountBalances(data.user_id, data.account_id)
  return data
}

export async function deleteExpense(expenseId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from('expenses')
    .select('account_id')
    .eq('id', expenseId)
    .single()
  if (selectError) throw selectError
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw error
  if (existing?.account_id) await recomputeAccountBalances(userId, existing.account_id)
}

/** IDs de categorías que ya tienen al menos un gasto registrado en este período */
export async function getExpensedCategoryIds(userId, periodId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category_id')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return new Set((data ?? []).map((e) => e.category_id))
}

export async function totalExpensesForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data.reduce((sum, e) => sum + Number(e.amount), 0)
}

/** Gastos agrupados por categoría (para el donut) */
export async function expensesByCategory(userId, periodId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, expense_categories(id, name, color)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error

  const grouped = {}
  for (const row of data) {
    const cat = row.expense_categories
    if (!cat) continue
    if (!grouped[cat.id]) grouped[cat.id] = { name: cat.name, color: cat.color, total: 0 }
    grouped[cat.id].total += Number(row.amount)
  }
  return Object.values(grouped)
}

/** Evolución de una categoría específica a través de varios períodos (para Category Trend) */
export async function categoryTrend(userId, categoryId, periodIds) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, period_id')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .in('period_id', periodIds)
  if (error) throw error

  const totals = {}
  for (const pid of periodIds) totals[pid] = 0
  for (const row of data) totals[row.period_id] += Number(row.amount)
  return totals
}

/**
 * Promedio histórico de gasto en una categoría, usando solo períodos con
 * gasto real (mínimo 3, si no hay suficiente historial no es significativo).
 */
export async function getCategoryHistoricalAverage(userId, categoryId, periodIds) {
  if (periodIds.length === 0) return null
  const totals = await categoryTrend(userId, categoryId, periodIds)
  const nonZero = Object.values(totals).filter((v) => v > 0)
  if (nonZero.length < 3) return null
  return nonZero.reduce((s, v) => s + v, 0) / nonZero.length
}
