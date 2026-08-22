-- Feature 2: Gastos recurrentes / suscripciones
-- Corre esto en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS recurring_expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  recurring_day int CHECK (recurring_day BETWEEN 1 AND 31),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Vincula un gasto real con la plantilla que lo generó (nullable: los gastos
-- manuales normales no tienen plantilla).
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS template_id uuid
  REFERENCES recurring_expense_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_user ON recurring_expense_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_template ON expenses(template_id);

ALTER TABLE recurring_expense_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_expense_templates_select_own" ON recurring_expense_templates
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "recurring_expense_templates_insert_own" ON recurring_expense_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "recurring_expense_templates_update_own" ON recurring_expense_templates
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "recurring_expense_templates_delete_own" ON recurring_expense_templates
  FOR DELETE USING (user_id = auth.uid());
