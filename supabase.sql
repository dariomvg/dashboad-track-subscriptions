-- =============================================================================
-- TrackMySubs: complete database schema
--
-- Run this file ONCE, on a fresh Supabase project (SQL Editor -> paste -> Run).
-- It creates, in a single transaction:
--   1. plans            plan catalog (prices, limits, trial) and its seed data
--   2. subscriptions    one row per user: current plan, status, billing period
--   3. services         the subscriptions each user tracks (Netflix, Spotify...)
--   4. payment_events   idempotency and audit log for Mercado Pago webhooks
--   5. functions and triggers (new-user bootstrap, plan limits, suspension)
--   6. Row Level Security, column-level privileges and policies
--
-- Safe to re-run? No: it creates objects without "if not exists" on purpose, so
-- that a partially applied schema fails loudly instead of being silently mixed.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. plans
--    Single source of truth for prices, limits and trial length. The server
--    reads prices from here; the client never sends an amount.
-- -----------------------------------------------------------------------------

create table public.plans (
  id text primary key check (id in ('free', 'standard', 'pro')),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'ARS' check (currency ~ '^[A-Z]{3}$'),
  frequency smallint not null check (frequency >= 0),          -- billing period, in months (0 = free)
  max_services integer check (max_services is null or max_services > 0),  -- null = unlimited
  trial_days smallint not null default 0 check (trial_days >= 0)
);

insert into public.plans (id, price, currency, frequency, max_services, trial_days) values
  ('free',     0,    'ARS', 0, 4,    0),
  ('standard', 4999, 'ARS', 1, 7,    30),
  ('pro',      9999, 'ARS', 1, null, 0);

-- -----------------------------------------------------------------------------
-- 2. subscriptions
--    One row per user. Written ONLY by the server (service role), never by the
--    client. Users can read their own row.
--      plan                 plan the user is on right now
--      pending_plan         plan that starts when the current paid period ends
--                           (scheduled downgrade); null when nothing is scheduled
--      status               active | pending | cancelled | suspended
--      current_period_end   end of the access already paid for (includes the
--                           grace days); null for the free plan
--      mp_preapproval_id    Mercado Pago subscription currently backing this row
--      trial_used           the free trial can only be used once per user
-- -----------------------------------------------------------------------------

create table public.subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan text not null default 'free' references public.plans (id),
  pending_plan text references public.plans (id),
  status text not null default 'active'
    check (status in ('active', 'pending', 'cancelled', 'suspended')),
  current_period_end timestamptz,
  mp_preapproval_id text unique,
  trial_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_free_has_no_period
    check (plan <> 'free' or current_period_end is null),
  constraint subscriptions_pending_plan_check
    check (pending_plan is null or pending_plan <> 'free')
);

-- -----------------------------------------------------------------------------
-- 3. services
--    What each user tracks. The client reads and writes this table directly
--    (RLS + column grants + triggers keep it safe).
--      last_paid_month  first day of the month the service was marked as paid;
--                       "paid this month" is just last_paid_month = current month,
--                       so it resets by itself every month (no cron needed)
-- -----------------------------------------------------------------------------

create table public.services (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly')),
  next_billing_date date not null,
  category text not null check (char_length(btrim(category)) between 1 and 50),
  status text not null default 'active'
    check (status in ('active', 'paused', 'cancelled')),
  last_paid_month date
    check (last_paid_month is null or extract(day from last_paid_month) = 1),
  created_at timestamptz not null default now()
);

create index services_user_id_idx on public.services (user_id);
create index services_user_status_idx on public.services (user_id, status);

-- -----------------------------------------------------------------------------
-- 4. payment_events
--    Webhook idempotency and payment history. (provider, event_key) is unique,
--    so a notification delivered twice is recorded and processed once.
--    Server-only: no client can read or write it.
-- -----------------------------------------------------------------------------

create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_key text not null,
  event_type text,
  resource_id text,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  payload jsonb,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_events_provider_event_key_key unique (provider, event_key)
);

create index payment_events_user_id_idx on public.payment_events (user_id);
create index payment_events_resource_id_idx on public.payment_events (resource_id);

-- -----------------------------------------------------------------------------
-- 5. Functions and triggers
--    All functions use an empty search_path and fully qualified names.
--    None of them is executable by anon or authenticated (revoked below), so
--    they cannot be called through the REST API.
-- -----------------------------------------------------------------------------

-- Keeps subscriptions.updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Every new auth user starts on the free plan.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for users that already exist (no-op on a fresh project).
insert into public.subscriptions (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- The plan whose rules apply to a user right now, or null when the account is
-- suspended:
--   free plan or pending checkout          -> free
--   paid plan, active or cancelled, with
--   current_period_end still in the future -> that plan
--   anything else (expired, paused)        -> null (suspended)
create function public.effective_plan(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.plan = 'free' then 'free'
    when s.status = 'pending' then 'free'
    when s.status in ('active', 'cancelled') and s.current_period_end > now() then s.plan
    else null
  end
  from public.subscriptions s
  where s.user_id = p_user_id;
$$;

-- Enforces, in the database, what the UI also shows:
--   * a suspended account cannot create or modify services
--   * the number of ACTIVE services cannot exceed the plan's limit
-- A per-user advisory lock serializes concurrent requests so two parallel
-- inserts cannot both slip under the limit.
create function public.enforce_service_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_max integer;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  v_plan := public.effective_plan(new.user_id);
  if v_plan is null then
    raise exception 'account_suspended';
  end if;

  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select max_services into v_max from public.plans where id = v_plan;
    if v_max is not null then
      select count(*) into v_count
      from public.services
      where user_id = new.user_id and status = 'active';
      if v_count >= v_max then
        raise exception 'plan_limit_reached';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger services_enforce_limits
  before insert or update on public.services
  for each row execute function public.enforce_service_limits();

revoke execute on function
  public.set_updated_at(),
  public.handle_new_user(),
  public.effective_plan(uuid),
  public.enforce_service_limits()
from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security, privileges and policies
--    Default-deny: RLS on, every default grant removed, then only what each
--    role needs is granted back.
-- -----------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.services enable row level security;
alter table public.payment_events enable row level security;

revoke all on public.plans, public.subscriptions, public.services, public.payment_events
  from anon, authenticated;

-- plans: public catalog, read-only.
grant select on public.plans to anon, authenticated;

-- subscriptions: a user can only read their own row. All writes come from the
-- server with the service role (webhook and billing actions), which bypasses RLS.
grant select on public.subscriptions to authenticated;

-- services: full CRUD on own rows, but only on specific columns. user_id, id and
-- created_at can never be set or changed by the client.
grant select, delete on public.services to authenticated;
grant insert (title, amount, currency, billing_cycle, next_billing_date, category, status, last_paid_month)
  on public.services to authenticated;
grant update (title, amount, currency, billing_cycle, next_billing_date, category, status, last_paid_month)
  on public.services to authenticated;

-- payment_events: no grants and no policies = service role only.

create policy "plans_select_all"
  on public.plans for select
  to anon, authenticated
  using (true);

create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "services_select_own"
  on public.services for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "services_insert_own"
  on public.services for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "services_update_own"
  on public.services for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "services_delete_own"
  on public.services for delete
  to authenticated
  using (user_id = (select auth.uid()));

commit;

-- =============================================================================
-- Sanity checks (optional). Run them separately after the script above.
--
-- 1) RLS must be enabled on the four tables (all rows true):
--      select tablename, rowsecurity from pg_tables
--      where schemaname = 'public'
--        and tablename in ('plans','subscriptions','services','payment_events');
--
-- 2) The plans seed (3 rows):
--      select * from public.plans order by price;
--
-- 3) The signup trigger exists on auth.users:
--      select tgname from pg_trigger where tgname = 'on_auth_user_created';
--
-- 4) Helper functions must NOT be callable by clients (expect 0 rows):
--      select routine_name from information_schema.routine_privileges
--      where routine_schema = 'public'
--        and grantee in ('anon','authenticated','PUBLIC')
--        and routine_name in ('set_updated_at','handle_new_user',
--                             'effective_plan','enforce_service_limits');
-- =============================================================================
