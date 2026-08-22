-- Feature 7: Multi-moneda (DOP / USD)
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DOP';
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DOP';

-- Nota: el brief no listaba user_id para exchange_rates, pero se agrega
-- porque las 4 políticas RLS (select/insert/update/delete = auth.uid())
-- lo requieren, siguiendo el mismo patrón que el resto del schema.
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  from_currency text NOT NULL,
  to_currency text NOT NULL DEFAULT 'DOP',
  rate numeric NOT NULL CHECK (rate > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_user ON exchange_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_date ON exchange_rates(from_currency, to_currency, date);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exchange_rates_select_own" ON exchange_rates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "exchange_rates_insert_own" ON exchange_rates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "exchange_rates_update_own" ON exchange_rates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "exchange_rates_delete_own" ON exchange_rates FOR DELETE USING (user_id = auth.uid());

-- NOTA IMPORTANTE sobre patrimonio neto:
-- net_worth_snapshots sigue siendo calculado por el trigger existente sobre
-- account_balances/credit_card_balances, que no sabe de monedas (suma números
-- crudos). No modifiqué ese trigger porque su definición no está en este repo
-- y CLAUDE.md prohíbe que el frontend recalcule patrimonio neto manualmente.
-- Lo que SÍ se corrigió: "Disponible" en el Dashboard, que ya era una suma
-- hecha en el frontend, ahora sí convierte cada cuenta a DOP antes de sumar.
-- Si quieres que el patrimonio neto oficial también convierta monedas,
-- comparte la definición SQL del trigger y se ajusta en otra migración.
