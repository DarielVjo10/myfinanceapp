-- Feature 0: Trazabilidad por cuenta (ledger)
-- Corre esto en el SQL Editor de Supabase antes de usar la app con esta versión.

ALTER TABLE savings_contributions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savings_contributions_account_id
  ON savings_contributions(account_id);

-- No se requieren cambios de RLS: savings_contributions ya tiene sus 4 políticas
-- basadas en user_id = auth.uid(), y account_id es solo una columna adicional
-- en una tabla que ya está protegida.
