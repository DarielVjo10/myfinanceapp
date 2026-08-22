import { supabase } from '../lib/supabaseClient'

/** Registro append-only de a dónde fue el saldo al archivar una entidad — ver migración 018 */
export async function logEntityClosure(userId, { entityType, entityId, resolution, targetEntityId, amount, note }) {
  const { error } = await supabase.from('entity_closures').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    resolution,
    target_entity_id: targetEntityId || null,
    amount,
    note: note || null,
  })
  if (error) throw error
}
