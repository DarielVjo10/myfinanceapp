-- Pieza 1: Tarjetas de crédito completas
-- Corre esto en el SQL Editor de Supabase.

ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS cutoff_day int CHECK (cutoff_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS due_day int CHECK (due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS annual_interest_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_payment_pct numeric NOT NULL DEFAULT 5;

-- null = el usuario no ha indicado si pagó completo el mes anterior todavía
ALTER TABLE credit_card_balances
  ADD COLUMN IF NOT EXISTS paid_in_full boolean;
