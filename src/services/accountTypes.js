import { supabase } from '../lib/supabaseClient'

export async function listAccountTypes(userId) {
  const { data, error } = await supabase
    .from('account_types')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createAccountType(userId, name) {
  const { data, error } = await supabase
    .from('account_types')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAccountType(accountTypeId) {
  const { error } = await supabase.from('account_types').delete().eq('id', accountTypeId)
  if (error) throw error
}
