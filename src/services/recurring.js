import { supabase } from '../lib/supabaseClient'
import { createExpense } from './expenses'

export async function listRecurringTemplates(userId) {
  const { data, error } = await supabase
    .from('recurring_expense_templates')
    .select('*, expense_categories(name, color, icon)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createRecurringTemplate(userId, { categoryId, accountId, amount, description, recurringDay }) {
  const { data, error } = await supabase
    .from('recurring_expense_templates')
    .insert({
      user_id: userId,
      category_id: categoryId,
      account_id: accountId || null,
      amount,
      description,
      recurring_day: recurringDay || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurringTemplate(templateId, patch) {
  const { data, error } = await supabase
    .from('recurring_expense_templates')
    .update(patch)
    .eq('id', templateId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateRecurringTemplate(templateId) {
  const { error } = await supabase
    .from('recurring_expense_templates')
    .update({ is_active: false })
    .eq('id', templateId)
  if (error) throw error
}

/** Plantillas activas que aún NO tienen un gasto confirmado en este período */
export async function getPendingRecurringForPeriod(userId, periodId) {
  const [{ data: templates, error: e1 }, { data: confirmed, error: e2 }] = await Promise.all([
    supabase
      .from('recurring_expense_templates')
      .select('*, expense_categories(name)')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('expenses')
      .select('template_id')
      .eq('user_id', userId)
      .eq('period_id', periodId)
      .not('template_id', 'is', null),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const confirmedIds = new Set((confirmed ?? []).map((e) => e.template_id))
  return (templates ?? []).filter((t) => !confirmedIds.has(t.id))
}

/** Último monto realmente confirmado de esta plantilla (para detectar si cambió) */
export async function getLastActualAmount(userId, templateId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('user_id', userId)
    .eq('template_id', templateId)
    .order('expense_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.amount != null ? Number(data.amount) : null
}

/** Crea los gastos confirmados de una tanda de plantillas recurrentes para el mes actual */
export async function confirmRecurringExpenses(userId, periodId, items) {
  const results = []
  for (const item of items) {
    const data = await createExpense(userId, periodId, {
      categoryId: item.categoryId,
      accountId: item.accountId || null,
      amount: item.amount,
      description: item.description,
      templateId: item.templateId,
    })
    results.push(data)
  }
  return results
}
