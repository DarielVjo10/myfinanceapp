import { supabase } from '../lib/supabaseClient'
import { recomputeAccountBalances } from './accounts'

export async function listTransfersForPeriod(userId, periodId) {
  const { data, error } = await supabase
    .from('account_transfers')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId)
    .order('transfer_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createTransfer(userId, periodId, { fromAccountId, toAccountId, amount, note, transferDate }) {
  const { data, error } = await supabase
    .from('account_transfers')
    .insert({
      user_id: userId,
      period_id: periodId,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      note,
      transfer_date: transferDate || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()
  if (error) throw error
  await Promise.all([
    recomputeAccountBalances(userId, fromAccountId),
    recomputeAccountBalances(userId, toAccountId),
  ])
  return data
}

export async function deleteTransfer(transferId, userId) {
  const { data: existing, error: selectError } = await supabase
    .from('account_transfers')
    .select('from_account_id, to_account_id')
    .eq('id', transferId)
    .single()
  if (selectError) throw selectError
  const { error } = await supabase.from('account_transfers').delete().eq('id', transferId)
  if (error) throw error
  await Promise.all([
    recomputeAccountBalances(userId, existing.from_account_id),
    recomputeAccountBalances(userId, existing.to_account_id),
  ])
}
