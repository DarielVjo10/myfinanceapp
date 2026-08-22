-- Feature 7 (parte 2): hace que el trigger real de patrimonio neto convierta
-- monedas al sumar activos. NO toca deudas (decisión explícita: debts no es
-- por período, conectarlo reescribiría patrimonio neto de meses pasados).
-- Corre esto en el SQL Editor de Supabase.

create or replace function public.recalc_net_worth()
returns trigger language plpgsql as $$
declare
  v_period_id uuid := coalesce(new.period_id, old.period_id);
  v_user_id   uuid := coalesce(new.user_id, old.user_id);
  v_assets      numeric(14,2);
  v_liabilities numeric(14,2);
begin
  -- activos: cada cuenta se convierte a DOP con la tasa más reciente
  -- disponible para su moneda; si no hay tasa, esa cuenta se excluye del
  -- total (mejor que inventar un valor incorrecto).
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

  select coalesce(sum(balance),0) into v_liabilities
  from public.credit_card_balances where period_id = v_period_id;

  insert into public.net_worth_snapshots (user_id, period_id, total_assets, total_liabilities, calculated_at)
  values (v_user_id, v_period_id, v_assets, v_liabilities, now())
  on conflict (period_id) do update
    set total_assets = excluded.total_assets,
        total_liabilities = excluded.total_liabilities,
        calculated_at = now();

  return null;
end;
$$;

-- Los triggers trg_recalc_networth_accounts / trg_recalc_networth_cards ya
-- existen y apuntan a esta función por nombre — no hace falta recrearlos,
-- CREATE OR REPLACE FUNCTION actualiza el comportamiento en el sitio.
