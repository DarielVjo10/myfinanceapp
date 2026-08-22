-- Pieza 3: Inversiones personalizables
-- Corre esto en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS investment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  investment_type text,
  expected_annual_return numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  contribution_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investment_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id uuid NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES monthly_periods(id) ON DELETE CASCADE,
  value numeric NOT NULL CHECK (value >= 0),
  valuation_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investment_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_investment_accounts_user ON investment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_user_period ON investment_contributions(user_id, period_id);
CREATE INDEX IF NOT EXISTS idx_investment_valuations_user_period ON investment_valuations(user_id, period_id);

ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_accounts_select_own ON investment_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY investment_accounts_insert_own ON investment_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY investment_accounts_update_own ON investment_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY investment_accounts_delete_own ON investment_accounts FOR DELETE USING (user_id = auth.uid());

CREATE POLICY investment_contributions_select_own ON investment_contributions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY investment_contributions_insert_own ON investment_contributions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY investment_contributions_update_own ON investment_contributions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY investment_contributions_delete_own ON investment_contributions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY investment_valuations_select_own ON investment_valuations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY investment_valuations_insert_own ON investment_valuations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY investment_valuations_update_own ON investment_valuations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY investment_valuations_delete_own ON investment_valuations FOR DELETE USING (user_id = auth.uid());

-- Patrimonio neto: investment_valuations SÍ es por período (a diferencia de
-- debts), así que se puede sumar de forma segura como asset sin reescribir
-- meses pasados — cada período solo cuenta si tiene su propia valuación.
create or replace function public.recalc_net_worth()
returns trigger language plpgsql as $$
declare
  v_period_id uuid := coalesce(new.period_id, old.period_id);
  v_user_id   uuid := coalesce(new.user_id, old.user_id);
  v_assets      numeric(14,2);
  v_liabilities numeric(14,2);
  v_investments numeric(14,2);
begin
  select coalesce(sum(
    case
      when a.currency is null or a.currency = 'DOP' then ab.balance
      else ab.balance * (
        select er.rate from public.exchange_rates er
        where er.user_id = v_user_id
          and er.from_currency = a.currency
          and er.to_currency = 'DOP'
        order by er.date desc
        limit 1
      )
    end
  ), 0) into v_assets
  from public.account_balances ab
  join public.accounts a on a.id = ab.account_id
  where ab.period_id = v_period_id;

  select coalesce(sum(value), 0) into v_investments
  from public.investment_valuations
  where period_id = v_period_id;

  select coalesce(sum(balance),0) into v_liabilities
  from public.credit_card_balances where period_id = v_period_id;

  insert into public.net_worth_snapshots (user_id, period_id, total_assets, total_liabilities, calculated_at)
  values (v_user_id, v_period_id, v_assets + v_investments, v_liabilities, now())
  on conflict (period_id) do update
    set total_assets = excluded.total_assets,
        total_liabilities = excluded.total_liabilities,
        calculated_at = now();

  return null;
end;
$$;

create trigger trg_recalc_networth_investments
after insert or update or delete on public.investment_valuations
for each row execute function public.recalc_net_worth();
