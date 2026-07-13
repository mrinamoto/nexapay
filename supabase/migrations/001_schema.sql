-- NexaPay schema
-- Educational Demo - No Real Money or Financial Transactions

create extension if not exists pgcrypto;

do $$ begin
  create type public.account_role as enum ('customer', 'merchant', 'agent', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wallet_status as enum ('active', 'frozen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum (
    'send_money',
    'receive_money',
    'request_money',
    'merchant_payment',
    'add_money',
    'cash_out',
    'recharge',
    'bill_payment',
    'bank_transfer',
    'savings_deposit',
    'savings_withdrawal',
    'donation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum ('pending', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values ('starting_demo_balance', '{"amount":25000}')
on conflict (key) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone text not null unique check (phone ~ '^[0-9+ -]{8,20}$'),
  avatar_url text,
  role public.account_role not null default 'customer',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'BDT_DEMO',
  status public.wallet_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  transaction_type public.transaction_type not null,
  sender_wallet_id uuid references public.wallets(id),
  receiver_wallet_id uuid references public.wallets(id),
  amount numeric(14,2) not null check (amount > 0),
  fee numeric(14,2) not null default 0 check (fee >= 0),
  total_amount numeric(14,2) not null check (total_amount >= amount),
  status public.transaction_status not null default 'completed',
  reference text,
  metadata jsonb not null default '{}',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint transactions_has_wallet check (sender_wallet_id is not null or receiver_wallet_id is not null),
  constraint transactions_wallets_different check (
    sender_wallet_id is null
    or receiver_wallet_id is null
    or sender_wallet_id <> receiver_wallet_id
  ),
  constraint transactions_total_matches check (total_amount = amount + fee)
);

create table if not exists public.money_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  note text check (note is null or char_length(note) <= 240),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  favorite_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, favorite_user_id),
  check (user_id <> favorite_user_id)
);

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 140),
  category text not null check (char_length(category) between 2 and 80),
  merchant_code text not null unique check (merchant_code ~ '^NPM-[0-9]{4,}$'),
  qr_identifier text not null unique check (qr_identifier ~ '^NEXAPAY:MERCHANT:NPM-[0-9]{4,}$'),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  agent_code text not null unique check (agent_code ~ '^NPA-[0-9]{4,}$'),
  location text not null check (char_length(location) between 2 and 140),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  icon text,
  status public.account_status not null default 'active'
);

create table if not exists public.recharge_operators (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  logo_url text,
  status public.account_status not null default 'active'
);

create table if not exists public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  icon text,
  status public.account_status not null default 'active'
);

create table if not exists public.bill_providers (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.bill_categories(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  logo_url text,
  status public.account_status not null default 'active',
  unique (category_id, name)
);

create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  status public.account_status not null default 'active'
);

create table if not exists public.donation_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  description text check (description is null or char_length(description) <= 280),
  status public.account_status not null default 'active'
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint savings_current_not_above_target check (current_amount <= target_amount)
);

create table if not exists public.savings_goal_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  entry_type text not null check (entry_type in ('deposit', 'withdrawal', 'adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  note text check (note is null or char_length(note) <= 240),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 2 and 500),
  type text not null check (char_length(type) between 2 and 80),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  description text check (description is null or char_length(description) <= 500),
  image_url text,
  link text,
  status public.account_status not null default 'active',
  start_date date,
  end_date date,
  check (end_date is null or start_date is null or end_date >= start_date),
  unique (title, start_date)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(account_status);
create unique index if not exists idx_profiles_email_lower_unique on public.profiles (lower(email));
create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_wallets_status on public.wallets(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);
create index if not exists idx_transactions_sender_wallet on public.transactions(sender_wallet_id);
create index if not exists idx_transactions_receiver_wallet on public.transactions(receiver_wallet_id);
create index if not exists idx_transactions_type_created on public.transactions(transaction_type, created_at desc);
create index if not exists idx_transactions_status_created on public.transactions(status, created_at desc);
create index if not exists idx_transactions_metadata_gin on public.transactions using gin (metadata);
create index if not exists idx_transactions_reference_lower on public.transactions (lower(coalesce(reference, '')));
create index if not exists idx_money_requests_sender on public.money_requests(sender_id);
create index if not exists idx_money_requests_receiver on public.money_requests(receiver_id);
create index if not exists idx_money_requests_status_created on public.money_requests(status, created_at desc);
create index if not exists idx_favorites_user_created on public.favorites(user_id, created_at desc);
create index if not exists idx_favorites_favorite_user on public.favorites(favorite_user_id);
create index if not exists idx_merchants_owner on public.merchants(owner_id);
create index if not exists idx_merchants_status_category on public.merchants(status, category);
create index if not exists idx_agents_user on public.agents(user_id);
create index if not exists idx_agents_status_location on public.agents(status, location);
create index if not exists idx_service_categories_status on public.service_categories(status);
create index if not exists idx_recharge_operators_status on public.recharge_operators(status);
create index if not exists idx_bill_categories_status on public.bill_categories(status);
create index if not exists idx_bill_providers_category_status on public.bill_providers(category_id, status);
create index if not exists idx_banks_status on public.banks(status);
create index if not exists idx_donation_organizations_status on public.donation_organizations(status);
create index if not exists idx_savings_goals_user_status on public.savings_goals(user_id, status);
create index if not exists idx_savings_goal_entries_goal_created on public.savings_goal_entries(goal_id, created_at desc);
create index if not exists idx_savings_goal_entries_transaction on public.savings_goal_entries(transaction_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_promotions_status_dates on public.promotions(status, start_date, end_date);
create index if not exists idx_audit_logs_actor_created on public.audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_logs_entity_created on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_profile_fields()
returns trigger
language plpgsql
as $$
begin
  new.full_name := trim(new.full_name);
  new.email := lower(trim(new.email));
  new.phone := trim(new.phone);
  return new;
end;
$$;

drop trigger if exists profiles_normalize_fields on public.profiles;
create trigger profiles_normalize_fields
before insert or update on public.profiles
for each row execute function public.normalize_profile_fields();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists money_requests_set_updated_at on public.money_requests;
create trigger money_requests_set_updated_at
before update on public.money_requests
for each row execute function public.set_updated_at();

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and exists (
    select 1
    where new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.email is distinct from old.email
  ) then
    raise exception 'Customers can only update safe profile fields.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive_fields on public.profiles;
create trigger protect_profile_sensitive_fields
before update on public.profiles
for each row execute function public.protect_profile_sensitive_fields();

create or replace function public.enforce_role_owned_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_role public.account_role;
begin
  if tg_table_name = 'merchants' then
    select role into linked_role from public.profiles where id = new.owner_id;
    if linked_role <> 'merchant' then
      raise exception 'Merchant records must be linked to a merchant profile.';
    end if;
  elsif tg_table_name = 'agents' then
    select role into linked_role from public.profiles where id = new.user_id;
    if linked_role <> 'agent' then
      raise exception 'Agent records must be linked to an agent profile.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_merchant_owner_role on public.merchants;
create trigger enforce_merchant_owner_role
before insert or update of owner_id on public.merchants
for each row execute function public.enforce_role_owned_records();

drop trigger if exists enforce_agent_user_role on public.agents;
create trigger enforce_agent_user_role
before insert or update of user_id on public.agents
for each row execute function public.enforce_role_owned_records();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  start_balance numeric(14,2);
begin
  select coalesce((value->>'amount')::numeric, 25000)
    into start_balance
  from public.system_settings
  where key = 'starting_demo_balance';

  if start_balance is null then
    start_balance := 25000;
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'NexaPay User'),
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'phone', ''),
      '01' || lpad((abs(hashtext(new.id::text)) % 1000000000)::text, 9, '0')
    ),
    'customer'
  );

  insert into public.wallets (user_id, balance)
  values (new.id, start_balance);

  insert into public.notifications (user_id, title, message, type)
  values (
    new.id,
    'Welcome to NexaPay',
    'Your educational demo wallet was created. No real money or financial transactions are involved.',
    'admin_announcement'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
