-- Pieza 2: Cuentas bancarias personalizables con interés
-- Corre esto en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_types_user ON account_types(user_id);

ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_types_select_own ON account_types FOR SELECT USING (user_id = auth.uid());
CREATE POLICY account_types_insert_own ON account_types FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY account_types_update_own ON account_types FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY account_types_delete_own ON account_types FOR DELETE USING (user_id = auth.uid());

-- account_type_id es adicional y opcional: no reemplaza la columna `type`
-- existente (bank/cash/other), que se sigue usando para el ícono. Es el
-- nombre personalizado y específico (Ahorro, Corriente, Plazo Fijo/CDT...).
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type_id uuid REFERENCES account_types(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS annual_interest_rate numeric NOT NULL DEFAULT 0;
