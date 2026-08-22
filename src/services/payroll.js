import { supabase } from '../lib/supabaseClient'
import { createIncome } from './incomes'
import { calculatePayrollNet } from '../utils/payroll'

export async function getIsrBrackets(year = 2026) {
  const { data, error } = await supabase
    .from('isr_brackets')
    .select('*')
    .eq('effective_year', year)
    .order('min_annual', { ascending: true })
  if (error) throw error
  return data
}

export async function getActivePayrollSettings(userId) {
  const { data, error } = await supabase
    .from('payroll_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertPayrollSettings(userId, { id, name = 'Sueldo', grossSalary, afpRate, sfsRate, accountId, paymentDay }) {
  const payload = {
    user_id: userId,
    name,
    gross_salary: grossSalary,
    afp_rate: afpRate,
    sfs_rate: sfsRate,
    account_id: accountId || null,
    payment_day: paymentDay,
    is_active: true,
  }
  const query = id
    ? supabase.from('payroll_settings').update(payload).eq('id', id)
    : supabase.from('payroll_settings').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function deactivatePayrollSettings(id) {
  const { error } = await supabase.from('payroll_settings').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

/**
 * Igual que autoGenerateRecurringExpenses (services/recurring.js) pero para
 * el ingreso de nómina: best-effort en el cliente, no un cron real. Crea el
 * ingreso neto del período cuando el payment_day ya llegó y todavía no
 * existe un ingreso de esta configuración para ese período.
 */
export async function autoGeneratePayrollIncome(userId, period) {
  const settings = await getActivePayrollSettings(userId)
  if (!settings) return null

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const isFuturePeriod = period.year > todayYear || (period.year === todayYear && period.month > todayMonth)
  if (isFuturePeriod) return null

  const isCurrentPeriod = period.year === todayYear && period.month === todayMonth
  if (isCurrentPeriod && settings.payment_day > today.getDate()) return null

  const { data: existing, error: existingError } = await supabase
    .from('incomes')
    .select('id')
    .eq('user_id', userId)
    .eq('period_id', period.id)
    .eq('payroll_settings_id', settings.id)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return null

  const brackets = await getIsrBrackets(period.year >= 2027 ? 2027 : 2026)
  const { netSalary } = calculatePayrollNet({
    grossSalary: settings.gross_salary,
    afpRate: settings.afp_rate,
    sfsRate: settings.sfs_rate,
    brackets,
  })

  const daysInMonth = new Date(period.year, period.month, 0).getDate()
  const day = Math.min(settings.payment_day, daysInMonth)
  const incomeDate = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  try {
    return await createIncome(userId, period.id, {
      type: 'fixed',
      source: settings.name,
      accountId: settings.account_id,
      amount: Math.round(netSalary * 100) / 100,
      description: 'Ingreso de nómina (sueldo neto)',
      incomeDate,
      payrollSettingsId: settings.id,
    })
  } catch (err) {
    // 23505 = unique_violation (migración 016): otra llamada concurrente ya
    // lo creó una fracción de segundo antes — no es un error real.
    if (err?.code === '23505') return null
    throw err
  }
}
