import { supabase } from '../lib/supabaseClient'

export async function getFinancialSettings(userId) {
  const { data, error } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateFinancialSettings(userId, { needsPct, wantsPct, savingsPct }) {
  const { data, error } = await supabase
    .from('financial_settings')
    .update({ needs_pct: needsPct, wants_pct: wantsPct, savings_pct: savingsPct })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getInterestSettings(userId) {
  const { data, error } = await supabase
    .from('interest_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertInterestSettings(userId, existingId, payload) {
  if (existingId) {
    const { data, error } = await supabase
      .from('interest_settings')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('interest_settings')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}
