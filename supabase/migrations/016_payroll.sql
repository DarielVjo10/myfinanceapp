-- Parte G: nómina dominicana (sueldo neto automático + calculadora)
-- Corre esto en el SQL Editor de Supabase.

-- Configuración de "ingreso fijo" (sueldo) — se arma UNA VEZ, igual que una
-- plantilla de gasto recurrente. Las tasas de AFP/SFS son configurables
-- (no hardcodeadas) porque la ley puede cambiarlas.
CREATE TABLE IF NOT EXISTS payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Sueldo',
  gross_salary numeric NOT NULL CHECK (gross_salary > 0),
  afp_rate numeric NOT NULL DEFAULT 2.87,
  sfs_rate numeric NOT NULL DEFAULT 3.04,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  -- día del mes en que se paga el sueldo: mismo mecanismo que
  -- recurring_day en recurring_expense_templates (ver services/recurring.js)
  payment_day int NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_user ON payroll_settings(user_id);
-- una sola configuración de sueldo activa a la vez por usuario
CREATE UNIQUE INDEX IF NOT EXISTS payroll_settings_one_active_per_user
  ON payroll_settings (user_id)
  WHERE is_active = true;

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY payroll_settings_select_own ON payroll_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY payroll_settings_insert_own ON payroll_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY payroll_settings_update_own ON payroll_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY payroll_settings_delete_own ON payroll_settings FOR DELETE USING (user_id = auth.uid());

-- Escala progresiva del ISR (Impuesto Sobre la Renta) dominicano, anual.
-- effective_year permite agregar el tramo 2027 (Ley 30-26, exención
-- RD$480,000 anual) sin tocar la lógica de cálculo — services/payroll.js
-- siempre pide los tramos del año correspondiente.
CREATE TABLE IF NOT EXISTS isr_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_annual numeric NOT NULL,
  max_annual numeric, -- NULL = sin tope (último tramo)
  rate numeric NOT NULL, -- fracción, ej. 0.15 = 15%
  fixed_amount numeric NOT NULL DEFAULT 0,
  effective_year int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_isr_brackets_year ON isr_brackets(effective_year);

-- Es información pública de ley (no hay dato personal), toda la app la
-- puede leer con RLS abierto en SELECT; nunca se inserta/edita desde el
-- cliente.
ALTER TABLE isr_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY isr_brackets_select_all ON isr_brackets FOR SELECT USING (true);

-- Escala DGII vigente 2026 (congelada desde 2018, Resolución
-- DDG-AR1-2026-00001). Se inserta solo si el año 2026 no tiene tramos
-- todavía, para poder re-correr esta migración sin duplicar filas.
INSERT INTO isr_brackets (min_annual, max_annual, rate, fixed_amount, effective_year)
SELECT * FROM (VALUES
  (0::numeric,          416220.00::numeric, 0.00::numeric, 0.00::numeric,     2026),
  (416220.00::numeric,  624329.00::numeric, 0.15::numeric, 0.00::numeric,     2026),
  (624329.00::numeric,  867123.00::numeric, 0.20::numeric, 31216.00::numeric, 2026),
  (867123.00::numeric,  NULL::numeric,      0.25::numeric, 79776.00::numeric, 2026)
) AS v(min_annual, max_annual, rate, fixed_amount, effective_year)
WHERE NOT EXISTS (SELECT 1 FROM isr_brackets WHERE effective_year = 2026);

-- Vincula un ingreso auto-generado a la configuración de nómina que lo
-- creó, igual que expenses.template_id para gastos recurrentes — permite
-- detectar "ya se generó este mes" y evitar duplicados.
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS payroll_settings_id uuid REFERENCES payroll_settings(id) ON DELETE SET NULL;

-- Misma protección real contra condición de carrera que migración 014
-- (ver el comentario ahí — React puede disparar el efecto de carga dos
-- veces y duplicar el ingreso si no hay un constraint a nivel de base).
CREATE UNIQUE INDEX IF NOT EXISTS incomes_unique_payroll_per_period
  ON incomes (payroll_settings_id, period_id)
  WHERE payroll_settings_id IS NOT NULL;
