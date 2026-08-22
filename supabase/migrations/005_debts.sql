-- Feature 4: Deudas y tarjetas de crédito
-- Corre esto en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  interest_rate numeric NOT NULL DEFAULT 0,
  minimum_payment numeric NOT NULL DEFAULT 0,
  due_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debts_select_own" ON debts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "debts_insert_own" ON debts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "debts_update_own" ON debts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "debts_delete_own" ON debts FOR DELETE USING (user_id = auth.uid());

-- NOTA: a diferencia del resto del schema, `debts` es deliberadamente NO
-- histórica por período (balance es un valor actual mutable, como accounts.name).
-- El patrimonio neto (net_worth_snapshots) sigue siendo mantenido por el
-- trigger existente sobre account_balances/credit_card_balances; esta tabla
-- NO está conectada a ese trigger todavía. El frontend muestra un
-- "patrimonio neto incluyendo deudas" derivado solo para mostrar, sin
-- sobrescribir el valor oficial. Si quieres que las deudas alimenten el
-- trigger real, comparte su definición SQL y se agrega en otra migración.
