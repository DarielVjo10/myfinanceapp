-- Vincula una meta de ahorro a la cuenta donde realmente vive ese dinero,
-- para poder proyectar el interés que esa cuenta genera sobre el ahorro.
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
