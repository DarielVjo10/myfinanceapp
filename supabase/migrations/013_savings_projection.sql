-- Pieza 4: Metas de ahorro con lógica de aportes robusta
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS planned_monthly_contribution numeric;

ALTER TABLE savings_contributions
  ADD COLUMN IF NOT EXISTS contribution_type text NOT NULL DEFAULT 'planned'
    CHECK (contribution_type IN ('planned', 'extraordinary'));
