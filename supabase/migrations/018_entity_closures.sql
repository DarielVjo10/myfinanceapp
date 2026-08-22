-- Cierre de entidades con saldo (metas, cuentas, tarjetas, inversiones):
-- ninguna de estas se puede archivar con saldo > 0 sin documentar a dónde
-- fue ese dinero (transferido a otra entidad, o retirado de la app).
-- Corre esto en el SQL Editor de Supabase.

create table if not exists entity_closures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('savings_goal', 'account', 'credit_card', 'investment_account')),
  entity_id uuid not null,
  resolution text not null check (resolution in ('transferred', 'external')),
  target_entity_id uuid null,
  amount numeric not null,
  note text null,
  created_at timestamptz not null default now()
);

alter table entity_closures enable row level security;

create policy entity_closures_select_own ON entity_closures FOR SELECT USING (user_id = auth.uid());
create policy entity_closures_insert_own ON entity_closures FOR INSERT WITH CHECK (user_id = auth.uid());

create index if not exists entity_closures_user_entity_idx on entity_closures (user_id, entity_type, entity_id);

alter table savings_goals add column if not exists closed_at timestamptz null;
alter table savings_goals add column if not exists closure_reason text null check (closure_reason in ('transferred', 'external'));
alter table savings_goals add column if not exists closure_note text null;

alter table accounts add column if not exists closed_at timestamptz null;
alter table accounts add column if not exists closure_reason text null check (closure_reason in ('transferred', 'external'));
alter table accounts add column if not exists closure_note text null;

alter table credit_cards add column if not exists closed_at timestamptz null;
alter table credit_cards add column if not exists closure_reason text null check (closure_reason in ('transferred', 'external'));
alter table credit_cards add column if not exists closure_note text null;

alter table investment_accounts add column if not exists closed_at timestamptz null;
alter table investment_accounts add column if not exists closure_reason text null check (closure_reason in ('transferred', 'external'));
alter table investment_accounts add column if not exists closure_note text null;
