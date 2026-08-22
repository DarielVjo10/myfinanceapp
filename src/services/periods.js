import { supabase } from '../lib/supabaseClient'
import { periodBounds } from '../utils/format'

export async function listPeriods(userId) {
  const { data, error } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: true })
    .order('month', { ascending: true })
  if (error) throw error
  return data
}

export async function getOrCreatePeriod(userId, year, month) {
  const { data: existing, error: selectError } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (selectError) throw selectError
  if (existing) return existing

  const bounds = periodBounds(year, month)
  const { data, error } = await supabase
    .from('monthly_periods')
    .insert({ user_id: userId, year, month, ...bounds, status: 'open' })
    .select()
    .single()
  if (error) {
    // otra llamada concurrente (p. ej. React StrictMode) ya insertó este período
    if (error.code === '23505') {
      const { data: existingAfterRace, error: retryError } = await supabase
        .from('monthly_periods')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .single()
      if (retryError) throw retryError
      return existingAfterRace
    }
    throw error
  }
  return data
}

export async function closePeriod(periodId) {
  const { error } = await supabase
    .from('monthly_periods')
    .update({ status: 'closed' })
    .eq('id', periodId)
  if (error) throw error
}

/**
 * "Clonar mes": copia SOLO configuración (categorías, metas, cuentas,
 * presupuestos, distribución) hacia un nuevo período. Nunca copia
 * movimientos (expenses, incomes, savings_contributions, balances).
 */
export async function cloneMonthConfig(userId, fromPeriodId, toPeriodId) {
  // Presupuestos por categoría
  const { data: budgets } = await supabase
    .from('category_budgets')
    .select('category_id, budgeted_amount')
    .eq('period_id', fromPeriodId)

  if (budgets?.length) {
    const rows = budgets.map((b) => ({
      user_id: userId,
      category_id: b.category_id,
      period_id: toPeriodId,
      budgeted_amount: b.budgeted_amount,
    }))
    const { error } = await supabase.from('category_budgets').upsert(rows, {
      onConflict: 'category_id,period_id',
    })
    if (error) throw error
  }

  // Distribución planificada por cuenta
  const { data: distributions } = await supabase
    .from('account_distributions')
    .select('account_id, amount')
    .eq('period_id', fromPeriodId)

  if (distributions?.length) {
    const rows = distributions.map((d) => ({
      user_id: userId,
      account_id: d.account_id,
      period_id: toPeriodId,
      amount: d.amount,
    }))
    const { error } = await supabase.from('account_distributions').upsert(rows, {
      onConflict: 'account_id,period_id',
    })
    if (error) throw error
  }

  // Nota: categorías, metas y cuentas ya son entidades reutilizables
  // (no están atadas a un período), por lo que no necesitan copiarse:
  // simplemente se siguen usando en el nuevo mes.
}
