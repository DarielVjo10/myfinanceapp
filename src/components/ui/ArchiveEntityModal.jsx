import { useState } from 'react'
import { Modal } from './Modal'
import { Field, Input, Select } from './Input'
import { Button } from './Button'
import { formatMoney } from '../../utils/format'

/**
 * Modal obligatorio antes de archivar cualquier entidad con saldo > 0
 * (metas, cuentas, tarjetas, inversiones): no deja avanzar sin elegir a
 * dónde va ese saldo, para que nunca "desaparezca" solo porque la entidad
 * se desactivó. El caller decide qué significa "transferir" para su tipo
 * de entidad (reasignar aportes, reutilizar account_transfers, etc.) — este
 * componente solo captura la elección y la pasa a onResolve.
 */
export function ArchiveEntityModal({ open, onClose, entityLabel, balance, targetOptions, onResolve }) {
  const [resolution, setResolution] = useState('transferred')
  const [targetId, setTargetId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const canConfirm = resolution === 'transferred' ? !!targetId : true

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSaving(true)
    try {
      await onResolve({ resolution, targetId: resolution === 'transferred' ? targetId : null, note })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Archivar "${entityLabel}"`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Esta entidad todavía tiene saldo: <span className="tabular font-medium text-ink">{formatMoney(balance)}</span>.
          Antes de archivarla, dinos a dónde va ese dinero.
        </p>

        <div className="space-y-2">
          <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${resolution === 'transferred' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
            <input type="radio" name="resolution" className="mt-1" checked={resolution === 'transferred'} onChange={() => setResolution('transferred')} />
            <span className="text-sm text-ink">Transferir el saldo a otra {entityLabel.toLowerCase().includes('cuenta') ? 'cuenta' : 'entidad'} activa</span>
          </label>
          {resolution === 'transferred' && (
            <div className="pl-7">
              <Field label="Destino">
                <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  {targetOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${resolution === 'external' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'}`}>
            <input type="radio" name="resolution" className="mt-1" checked={resolution === 'external'} onChange={() => setResolution('external')} />
            <span className="text-sm text-ink">El dinero sigue existiendo pero fuera de la app (ej. lo saqué en efectivo, cerré la cuenta en el banco)</span>
          </label>
          {resolution === 'external' && (
            <div className="pl-7">
              <Field label="Nota (opcional)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Retirado en efectivo el 22/08" />
              </Field>
            </div>
          )}
        </div>

        <Button className="w-full" loading={saving} disabled={!canConfirm} onClick={handleConfirm}>
          Confirmar y archivar
        </Button>
      </div>
    </Modal>
  )
}
