import { supabase } from '../lib/supabaseClient'

export async function listDebts(userId) {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createDebt(userId, { name, balance, interestRate, minimumPayment, dueDate }) {
  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: userId,
      name,
      balance,
      interest_rate: interestRate || 0,
      minimum_payment: minimumPayment || 0,
      due_date: dueDate || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDebt(debtId, patch) {
  const { data, error } = await supabase
    .from('debts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', debtId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateDebt(debtId) {
  const { error } = await supabase
    .from('debts')
    .update({ is_active: false })
    .eq('id', debtId)
  if (error) throw error
}
