-- Feature 1: Transferencias entre cuentas
-- Corre esto en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  period_id uuid NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_transfers_user_period ON account_transfers(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_from ON account_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_to ON account_transfers(to_account_id);

ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_transfers_select_own" ON account_transfers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "account_transfers_insert_own" ON account_transfers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "account_transfers_update_own" ON account_transfers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "account_transfers_delete_own" ON account_transfers
  FOR DELETE USING (user_id = auth.uid());

-- Nota: las transferencias son deliberadamente su propia tabla, separada de
-- incomes/expenses, para que Dashboard/History/Analytics (que solo leen esas
-- dos tablas) nunca las cuenten como ingreso o gasto real.
