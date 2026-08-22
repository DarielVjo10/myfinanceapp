import { supabase } from '../lib/supabaseClient'
import { recomputeAccountBalances } from './accounts'
import { logEntityClosure } from './closures'

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

/**
 * Cierra una cuenta con saldo > 0 (ver migración 018 / ArchiveEntityModal).
 * "Transferir" reutiliza createTransfer (account_transfers) en vez de
 * duplicar su lógica — ya recalcula el balance de ambas cuentas.
 */
export async function closeAccount(userId, periodId, accountId, { resolution, targetAccountId, amount, note }) {
  if (resolution === 'transferred') {
    await createTransfer(userId, periodId, {
      fromAccountId: accountId,
      toAccountId: targetAccountId,
      amount,
      note: note || 'Cierre de cuenta — saldo transferido',
    })
  }

  await logEntityClosure(userId, {
    entityType: 'account',
    entityId: accountId,
    resolution,
    targetEntityId: targetAccountId,
    amount,
    note,
  })

  const { error } = await supabase
    .from('accounts')
    .update({
      is_active: false,
      closed_at: new Date().toISOString(),
      closure_reason: resolution,
      closure_note: note || null,
    })
    .eq('id', accountId)
  if (error) throw error
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
