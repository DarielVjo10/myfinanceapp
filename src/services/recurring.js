import { supabase } from '../lib/supabaseClient'
import { createExpense } from './expenses'

/** Todas las plantillas (activas e inactivas) — la UI muestra el estado de cada una */
export async function listRecurringTemplates(userId) {
  const { data, error } = await supabase
    .from('recurring_expense_templates')
    .select('*, expense_categories(name, color, icon), accounts(name)')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
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

/**
 * Auto-genera (sin pedir confirmación) los gastos de las plantillas recurrentes
 * activas cuyo `recurring_day` ya llegó dentro del período dado, usando la
 * fecha real de ese día (no la fecha de hoy).
 *
 * IMPORTANTE: esto es "best-effort en el cliente" — se ejecuta cuando el
 * usuario abre Dashboard.jsx o Expenses.jsx, NO es un cron job real. Si el
 * usuario no abre la app ese mes, el gasto no se genera hasta que vuelva a
 * abrirla (en cuyo momento se genera igual, con la fecha correcta del
 * recurring_day, aunque ya haya pasado). Para que se genere aunque el
 * usuario nunca abra la app, se necesitaría un cron real (Supabase Edge
 * Function + pg_cron) — es una mejora futura, no implementada aquí.
 */
export async function autoGenerateRecurringExpenses(userId, period) {
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const isFuturePeriod = period.year > todayYear || (period.year === todayYear && period.month > todayMonth)
  if (isFuturePeriod) return []

  const isCurrentPeriod = period.year === todayYear && period.month === todayMonth
  const todayDay = today.getDate()

  const pending = await getPendingRecurringForPeriod(userId, period.id)
  const daysInMonth = new Date(period.year, period.month, 0).getDate()

  // sin recurring_day no hay forma de saber cuándo generarlo automáticamente
  const eligible = pending.filter((t) => {
    if (!t.recurring_day) return false
    if (isCurrentPeriod) return t.recurring_day <= todayDay
    return true // período ya completamente en el pasado: el día siempre "ya pasó"
  })

  const created = []
  for (const t of eligible) {
    const day = Math.min(t.recurring_day, daysInMonth)
    const expenseDate = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    try {
      const expense = await createExpense(userId, period.id, {
        categoryId: t.category_id,
        accountId: t.account_id || null,
        amount: Number(t.amount),
        description: t.description || t.expense_categories?.name,
        templateId: t.id,
        expenseDate,
      })
      created.push({ ...expense, categoryName: t.expense_categories?.name })
    } catch (err) {
      // 23505 = unique_violation en el índice de la migración 014: otra
      // llamada concurrente (ej. React StrictMode duplicando el efecto, o
      // dos pestañas abiertas) ya lo creó una fracción de segundo antes —
      // no es un error real, simplemente ya no hay nada que hacer aquí.
      if (err?.code !== '23505') throw err
    }
  }
  return created
}
