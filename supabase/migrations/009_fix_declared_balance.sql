-- Bugfix: distinguir un balance REALMENTE declarado por el usuario de un
-- balance auto-calculado (0 + movimientos) que el ledger escribe para sanar
-- períodos. Sin esto, una cuenta nueva sin actividad queda con filas en 0
-- para todos los períodos y el frontend cree que ya tiene "balance inicial
-- declarado" en el período más antiguo, bloqueando la edición en el período
-- actual.
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE account_balances ADD COLUMN IF NOT EXISTS is_declared boolean NOT NULL DEFAULT false;

-- Preserva todo el historial ya calculado tal cual está hoy (no cambia
-- ningún número visible); solo las filas que el ledger escriba DE AQUÍ EN
-- ADELANTE para períodos no-declarados quedarán correctamente marcadas
-- como no declaradas.
UPDATE account_balances SET is_declared = true WHERE is_declared = false;
