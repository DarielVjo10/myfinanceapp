import { supabase } from '../lib/supabaseClient'

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function updateFullName(fullName) {
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
  if (error) throw error
  return data
}

// Tablas propias del usuario. monthly_periods e investment_accounts cascadean
// (ON DELETE CASCADE) a la mayoría de sus movimientos por período.
const USER_OWNED_TABLES = [
  'monthly_periods',
  'accounts',
  'account_types',
  'credit_cards',
  'expense_categories',
  'savings_goals',
  'debts',
  'investment_accounts',
  'recurring_expense_templates',
  'exchange_rates',
  'financial_settings',
  'interest_settings',
]

/**
 * Borra todos los datos financieros del usuario. NO borra la cuenta de
 * autenticación (login) en sí — eso requiere una función de servidor con
 * permisos de administrador que esta app no tiene configurada.
 */
export async function wipeAllUserData(userId) {
  for (const table of USER_OWNED_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) throw new Error(`Error borrando ${table}: ${error.message}`)
  }
  await supabase.from('profiles').delete().eq('id', userId)
}
