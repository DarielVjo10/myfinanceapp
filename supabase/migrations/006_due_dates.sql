-- Feature 5: Recordatorios de fecha límite
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS due_day int CHECK (due_day BETWEEN 1 AND 31);
