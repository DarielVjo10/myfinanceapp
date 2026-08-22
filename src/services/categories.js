import { supabase } from '../lib/supabaseClient'

export async function listCategories(userId) {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createCategory(userId, { name, classification = 'wants', icon, color }) {
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ user_id: userId, name, classification, icon, color })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(categoryId, patch) {
  const { data, error } = await supabase
    .from('expense_categories')
    .update(patch)
    .eq('id', categoryId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateCategory(categoryId) {
  const { error } = await supabase
    .from('expense_categories')
    .update({ is_active: false })
    .eq('id', categoryId)
  if (error) throw error
}

export async function getBudgetsForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('category_budgets')
    .select('*, expense_categories(name, classification, color, icon)')
    .eq('user_id', userId)
    .eq('period_id', periodId)
  if (error) throw error
  return data
}

export async function setBudget(userId, categoryId, periodId, budgetedAmount) {
  const { data, error } = await supabase
    .from('category_budgets')
    .upsert(
      { user_id: userId, category_id: categoryId, period_id: periodId, budgeted_amount: budgetedAmount },
      { onConflict: 'category_id,period_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}
