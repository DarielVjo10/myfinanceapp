-- Parte F: marca una meta de ahorro como "fondo de emergencia"
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS is_emergency_fund boolean NOT NULL DEFAULT false;

-- Solo una meta puede ser el fondo de emergencia a la vez (el índice de
-- salud financiera toma la primera que encuentre si hay más de una, pero
-- esto evita confusión desde el modelo de datos).
CREATE UNIQUE INDEX IF NOT EXISTS savings_goals_one_emergency_fund_per_user
  ON savings_goals (user_id)
  WHERE is_emergency_fund = true AND is_active = true;
