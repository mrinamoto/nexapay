-- NexaPay secure RPC functions
-- Wallet balances must be changed through these functions, not from frontend table updates.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function public.create_demo_transaction_id()
returns text
language sql
as $$
  select 'NXP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
$$;

create or replace function public.demo_fee(p_type public.transaction_type, p_amount numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_type in ('send_money', 'cash_out', 'bank_transfer') then round(greatest(p_amount, 0) * 0.01, 2)
    else 0
  end;
$$;

create or replace function public.add_audit_log(
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'));
end;
$$;

create or replace function public.add_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type)
  values (p_user_id, p_title, p_message, p_type);
end;
$$;

create or replace function public.search_demo_profiles(p_query text)
returns table (
  id uuid,
  full_name text,
  phone text,
  role public.account_role
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.phone, p.role
  from public.profiles p
  where p.account_status = 'active'
    and p.id <> auth.uid()
    and p.role in ('customer', 'merchant', 'agent')
    and (
      p.phone ilike '%' || coalesce(p_query, '') || '%'
      or p.full_name ilike '%' || coalesce(p_query, '') || '%'
    )
  order by p.full_name
  limit 20;
$$;

create or replace function public.list_demo_favorites()
returns table (
  id uuid,
  user_id uuid,
  favorite_user_id uuid,
  created_at timestamptz,
  favorite_name text,
  favorite_phone text,
  favorite_role public.account_role
)
language sql
security definer
set search_path = public
stable
as $$
  select
    f.id,
    f.user_id,
    f.favorite_user_id,
    f.created_at,
    p.full_name as favorite_name,
    p.phone as favorite_phone,
    p.role as favorite_role
  from public.favorites f
  join public.profiles p on p.id = f.favorite_user_id
  where (f.user_id = auth.uid() or public.is_admin())
    and p.account_status = 'active'
  order by f.created_at desc;
$$;

create or replace function public.search_demo_merchants(p_query text)
returns table (
  id uuid,
  owner_id uuid,
  business_name text,
  category text,
  merchant_code text,
  qr_identifier text,
  status public.account_status,
  owner_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id,
    m.owner_id,
    m.business_name,
    m.category,
    m.merchant_code,
    m.qr_identifier,
    m.status,
    p.full_name as owner_name
  from public.merchants m
  join public.profiles p on p.id = m.owner_id
  where auth.uid() is not null
    and m.status = 'active'
    and p.account_status = 'active'
    and p.role = 'merchant'
    and (
      m.business_name ilike '%' || coalesce(p_query, '') || '%'
      or m.category ilike '%' || coalesce(p_query, '') || '%'
      or m.merchant_code ilike '%' || coalesce(p_query, '') || '%'
    )
  order by m.business_name
  limit 20;
$$;

create or replace function public.get_demo_merchant_by_qr(p_qr_identifier text)
returns table (
  id uuid,
  owner_id uuid,
  business_name text,
  category text,
  merchant_code text,
  qr_identifier text,
  status public.account_status,
  owner_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id,
    m.owner_id,
    m.business_name,
    m.category,
    m.merchant_code,
    m.qr_identifier,
    m.status,
    p.full_name as owner_name
  from public.merchants m
  join public.profiles p on p.id = m.owner_id
  where auth.uid() is not null
    and m.status = 'active'
    and p.account_status = 'active'
    and p.role = 'merchant'
    and lower(trim(m.qr_identifier)) = lower(trim(coalesce(p_qr_identifier, '')))
  limit 1;
$$;

create or replace function public.search_demo_agents(p_query text default '')
returns table (
  id uuid,
  user_id uuid,
  agent_code text,
  location text,
  status public.account_status,
  agent_name text,
  agent_phone text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.user_id,
    a.agent_code,
    a.location,
    a.status,
    p.full_name as agent_name,
    p.phone as agent_phone
  from public.agents a
  join public.profiles p on p.id = a.user_id
  where auth.uid() is not null
    and a.status = 'active'
    and p.account_status = 'active'
    and p.role = 'agent'
    and (
      p.full_name ilike '%' || coalesce(p_query, '') || '%'
      or a.agent_code ilike '%' || coalesce(p_query, '') || '%'
      or a.location ilike '%' || coalesce(p_query, '') || '%'
    )
  order by p.full_name
  limit 20;
$$;

create or replace function public.transfer_demo_money(
  p_receiver_user_id uuid,
  p_amount numeric,
  p_reference text default null,
  p_transaction_type public.transaction_type default 'send_money',
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_user_id uuid := auth.uid();
  v_sender_wallet public.wallets%rowtype;
  v_receiver_wallet public.wallets%rowtype;
  v_sender_profile public.profiles%rowtype;
  v_receiver_profile public.profiles%rowtype;
  v_fee numeric(14,2);
  v_total numeric(14,2);
  v_amount numeric(14,2);
  v_reference text;
  v_idempotency_key text;
  v_existing_sender_user_id uuid;
  v_existing public.transactions%rowtype;
  v_tx public.transactions%rowtype;
begin
  if v_sender_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null then
    raise exception 'A transaction request identifier is required.';
  end if;

  if char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'Transaction request identifier length is invalid.';
  end if;

  if p_transaction_type not in ('send_money', 'request_money', 'merchant_payment', 'cash_out') then
    raise exception 'Unsupported transfer type.';
  end if;

  if p_receiver_user_id = v_sender_user_id then
    raise exception 'Sending demo money to yourself is not allowed.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);

  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount < 1 then
    raise exception 'Amount must be at least 1 demo taka.';
  end if;

  if v_amount > 100000 then
    raise exception 'Amount exceeds the maximum demo limit.';
  end if;

  v_reference := nullif(trim(coalesce(p_reference, '')), '');
  if v_reference is not null and char_length(v_reference) > 120 then
    raise exception 'Reference is too long.';
  end if;

  select t.*
    into v_existing
  from public.transactions t
  join public.wallets sender_wallet on sender_wallet.id = t.sender_wallet_id
  where t.idempotency_key = v_idempotency_key;

  if found then
    select user_id
      into v_existing_sender_user_id
    from public.wallets
    where id = v_existing.sender_wallet_id;

    if v_existing_sender_user_id = v_sender_user_id then
      return v_existing;
    end if;
    raise exception 'Duplicate transaction request identifier.';
  end if;

  select * into v_sender_profile from public.profiles where id = v_sender_user_id;
  select * into v_receiver_profile from public.profiles where id = p_receiver_user_id;

  if not found or v_receiver_profile.id is null then
    raise exception 'Receiver profile was not found.';
  end if;

  if v_sender_profile.id is null then
    raise exception 'Sender profile was not found.';
  end if;

  if v_sender_profile.account_status <> 'active' then
    raise exception 'Sender account is not active.';
  end if;

  if v_receiver_profile.account_status <> 'active' then
    raise exception 'Receiver account is not active.';
  end if;

  if p_transaction_type in ('send_money', 'request_money') and v_receiver_profile.role <> 'customer' then
    raise exception 'Send Money can only be sent to an active customer demo account.';
  end if;

  if p_transaction_type = 'merchant_payment' and v_receiver_profile.role <> 'merchant' then
    raise exception 'Merchant payments require a merchant receiver.';
  end if;

  if p_transaction_type = 'cash_out' and v_receiver_profile.role <> 'agent' then
    raise exception 'Cash out requires an agent receiver.';
  end if;

  if p_transaction_type = 'cash_out' and not exists (
    select 1
    from public.agents a
    where a.user_id = p_receiver_user_id
      and a.status = 'active'
  ) then
    raise exception 'Cash out requires an active registered demo agent.';
  end if;

  select * into v_sender_wallet from public.wallets where user_id = v_sender_user_id;
  select * into v_receiver_wallet from public.wallets where user_id = p_receiver_user_id;

  if v_sender_wallet.id is null then
    raise exception 'Sender wallet was not found.';
  end if;

  if v_receiver_wallet.id is null then
    raise exception 'Receiver wallet was not found.';
  end if;

  perform 1
  from public.wallets
  where id in (v_sender_wallet.id, v_receiver_wallet.id)
  order by id
  for update;

  select * into v_sender_wallet from public.wallets where id = v_sender_wallet.id;
  select * into v_receiver_wallet from public.wallets where id = v_receiver_wallet.id;

  if v_sender_wallet.status <> 'active' or v_receiver_wallet.status <> 'active' then
    raise exception 'Both demo wallets must be active.';
  end if;

  v_fee := public.demo_fee(p_transaction_type, v_amount);
  v_total := v_amount + v_fee;

  if v_sender_wallet.balance < v_total then
    raise exception 'Insufficient demo balance.';
  end if;

  update public.wallets
  set balance = balance - v_total
  where id = v_sender_wallet.id
    and balance >= v_total
  returning * into v_sender_wallet;

  if not found then
    raise exception 'Insufficient demo balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where id = v_receiver_wallet.id
  returning * into v_receiver_wallet;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    sender_wallet_id,
    receiver_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    p_transaction_type,
    v_sender_wallet.id,
    v_receiver_wallet.id,
    v_amount,
    v_fee,
    v_total,
    'completed',
    v_reference,
    coalesce(p_metadata, '{}') || jsonb_build_object(
      'sender_user_id', v_sender_user_id,
      'receiver_user_id', p_receiver_user_id,
      'sender_name', v_sender_profile.full_name,
      'receiver_name', v_receiver_profile.full_name,
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  perform public.add_notification(
    v_sender_user_id,
    'Demo money sent',
    'Your simulated transfer to ' || v_receiver_profile.full_name || ' was completed.',
    'money_sent'
  );
  perform public.add_notification(
    p_receiver_user_id,
    'Demo money received',
    v_sender_profile.full_name || ' sent you simulated NexaPay demo money.',
    'money_received'
  );
  perform public.add_audit_log(
    v_sender_user_id,
    'transfer_demo_money',
    'transactions',
    v_tx.id::text,
    jsonb_build_object('type', p_transaction_type, 'amount', v_amount, 'fee', v_fee, 'idempotency_key', v_idempotency_key)
  );

  return v_tx;
exception
  when unique_violation then
    select t.*
      into v_existing
    from public.transactions t
    join public.wallets sender_wallet on sender_wallet.id = t.sender_wallet_id
    where t.idempotency_key = v_idempotency_key;

    if found then
      select user_id
        into v_existing_sender_user_id
      from public.wallets
      where id = v_existing.sender_wallet_id;
    end if;

    if found and v_existing_sender_user_id = v_sender_user_id then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.cash_out_demo_money(
  p_agent_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents%rowtype;
  v_agent_profile public.profiles%rowtype;
  v_tx public.transactions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select a.*
    into v_agent
  from public.agents a
  join public.profiles p on p.id = a.user_id
  where a.id = p_agent_id
    and a.status = 'active'
    and p.account_status = 'active'
    and p.role = 'agent';

  if v_agent.id is null then
    raise exception 'Active registered demo agent was not found.';
  end if;

  select p.*
    into v_agent_profile
  from public.profiles p
  where p.id = v_agent.user_id;

  if v_agent_profile.id is null then
    raise exception 'Active demo agent profile was not found.';
  end if;

  select *
    into v_tx
  from public.transfer_demo_money(
    v_agent.user_id,
    p_amount,
    'Simulation Only - No Real Cash Is Dispensed',
    'cash_out',
    jsonb_build_object(
      'agent_id', v_agent.id,
      'agent_code', v_agent.agent_code,
      'agent_name', v_agent_profile.full_name,
      'agent_location', v_agent.location,
      'channel', 'registered_demo_agent',
      'simulation_only', true
    ),
    p_idempotency_key
  );

  return v_tx;
end;
$$;

create or replace function public.agent_cash_in_demo_money(
  p_customer_user_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_user_id uuid := auth.uid();
  v_agent public.agents%rowtype;
  v_agent_profile public.profiles%rowtype;
  v_customer_profile public.profiles%rowtype;
  v_agent_wallet public.wallets%rowtype;
  v_customer_wallet public.wallets%rowtype;
  v_existing public.transactions%rowtype;
  v_amount numeric(14,2);
  v_idempotency_key text;
  v_tx public.transactions%rowtype;
begin
  if v_agent_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_customer_user_id is null then
    raise exception 'Choose a registered demo customer.';
  end if;

  if p_customer_user_id = v_agent_user_id then
    raise exception 'Agent cannot process a cash-in for themself.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount < 1 or v_amount > 100000 then
    raise exception 'Amount is outside the allowed demo agent limit.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null or char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'A valid transaction request identifier is required.';
  end if;

  select * into v_existing
  from public.transactions
  where idempotency_key = v_idempotency_key;

  if found then
    if v_existing.metadata->>'agent_user_id' = v_agent_user_id::text then
      return v_existing;
    end if;
    raise exception 'Duplicate transaction request identifier.';
  end if;

  select * into v_agent_profile from public.profiles where id = v_agent_user_id;
  select * into v_agent from public.agents where user_id = v_agent_user_id;
  select * into v_customer_profile from public.profiles where id = p_customer_user_id;

  if v_agent_profile.id is null or v_agent.id is null then
    raise exception 'Active registered demo agent was not found.';
  end if;

  if v_agent_profile.role <> 'agent' or v_agent_profile.account_status <> 'active' or v_agent.status <> 'active' then
    raise exception 'Agent account is not active.';
  end if;

  if v_customer_profile.id is null or v_customer_profile.role <> 'customer' or v_customer_profile.account_status <> 'active' then
    raise exception 'Choose an active registered demo customer.';
  end if;

  select * into v_agent_wallet from public.wallets where user_id = v_agent_user_id;
  select * into v_customer_wallet from public.wallets where user_id = p_customer_user_id;

  if v_agent_wallet.id is null or v_customer_wallet.id is null then
    raise exception 'Agent or customer wallet was not found.';
  end if;

  perform 1
  from public.wallets
  where id in (v_agent_wallet.id, v_customer_wallet.id)
  order by id
  for update;

  select * into v_agent_wallet from public.wallets where id = v_agent_wallet.id;
  select * into v_customer_wallet from public.wallets where id = v_customer_wallet.id;

  if v_agent_wallet.status <> 'active' or v_customer_wallet.status <> 'active' then
    raise exception 'Agent or customer wallet is not active.';
  end if;

  update public.wallets
  set balance = balance - v_amount
  where id = v_agent_wallet.id
    and balance >= v_amount
  returning * into v_agent_wallet;

  if not found then
    raise exception 'Insufficient agent demo balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where id = v_customer_wallet.id
  returning * into v_customer_wallet;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    sender_wallet_id,
    receiver_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    'add_money',
    v_agent_wallet.id,
    v_customer_wallet.id,
    v_amount,
    0,
    v_amount,
    'completed',
    'Agent cash-in simulation',
    jsonb_build_object(
      'sender_user_id', v_agent_user_id,
      'receiver_user_id', p_customer_user_id,
      'agent_id', v_agent.id,
      'agent_user_id', v_agent_user_id,
      'agent_code', v_agent.agent_code,
      'agent_name', v_agent_profile.full_name,
      'agent_location', v_agent.location,
      'customer_user_id', p_customer_user_id,
      'customer_name', v_customer_profile.full_name,
      'channel', 'agent_cash_in',
      'simulation_only', true,
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  perform public.add_notification(v_agent_user_id, 'Agent cash-in completed', 'You processed a simulated cash-in for ' || v_customer_profile.full_name || '.', 'agent_cash_in');
  perform public.add_notification(p_customer_user_id, 'Demo cash-in received', v_agent_profile.full_name || ' processed simulated cash-in demo money.', 'money_received');
  perform public.add_audit_log(v_agent_user_id, 'agent_cash_in', 'transactions', v_tx.id::text, jsonb_build_object('customer_id', p_customer_user_id, 'amount', v_amount, 'idempotency_key', v_idempotency_key));

  return v_tx;
exception
  when unique_violation then
    select * into v_existing from public.transactions where idempotency_key = v_idempotency_key;
    if found and v_existing.metadata->>'agent_user_id' = v_agent_user_id::text then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.agent_cash_out_demo_money(
  p_customer_user_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_user_id uuid := auth.uid();
  v_agent public.agents%rowtype;
  v_agent_profile public.profiles%rowtype;
  v_customer_profile public.profiles%rowtype;
  v_agent_wallet public.wallets%rowtype;
  v_customer_wallet public.wallets%rowtype;
  v_existing public.transactions%rowtype;
  v_amount numeric(14,2);
  v_fee numeric(14,2);
  v_total numeric(14,2);
  v_idempotency_key text;
  v_tx public.transactions%rowtype;
begin
  if v_agent_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_customer_user_id is null then
    raise exception 'Choose a registered demo customer.';
  end if;

  if p_customer_user_id = v_agent_user_id then
    raise exception 'Agent cannot process cash-out for themself.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount < 1 or v_amount > 100000 then
    raise exception 'Amount is outside the allowed demo agent limit.';
  end if;

  v_fee := round(v_amount * 0.01, 2);
  v_total := v_amount + v_fee;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null or char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'A valid transaction request identifier is required.';
  end if;

  select * into v_existing
  from public.transactions
  where idempotency_key = v_idempotency_key;

  if found then
    if v_existing.metadata->>'agent_user_id' = v_agent_user_id::text then
      return v_existing;
    end if;
    raise exception 'Duplicate transaction request identifier.';
  end if;

  select * into v_agent_profile from public.profiles where id = v_agent_user_id;
  select * into v_agent from public.agents where user_id = v_agent_user_id;
  select * into v_customer_profile from public.profiles where id = p_customer_user_id;

  if v_agent_profile.id is null or v_agent.id is null then
    raise exception 'Active registered demo agent was not found.';
  end if;

  if v_agent_profile.role <> 'agent' or v_agent_profile.account_status <> 'active' or v_agent.status <> 'active' then
    raise exception 'Agent account is not active.';
  end if;

  if v_customer_profile.id is null or v_customer_profile.role <> 'customer' or v_customer_profile.account_status <> 'active' then
    raise exception 'Choose an active registered demo customer.';
  end if;

  select * into v_agent_wallet from public.wallets where user_id = v_agent_user_id;
  select * into v_customer_wallet from public.wallets where user_id = p_customer_user_id;

  if v_agent_wallet.id is null or v_customer_wallet.id is null then
    raise exception 'Agent or customer wallet was not found.';
  end if;

  perform 1
  from public.wallets
  where id in (v_agent_wallet.id, v_customer_wallet.id)
  order by id
  for update;

  select * into v_agent_wallet from public.wallets where id = v_agent_wallet.id;
  select * into v_customer_wallet from public.wallets where id = v_customer_wallet.id;

  if v_agent_wallet.status <> 'active' or v_customer_wallet.status <> 'active' then
    raise exception 'Agent or customer wallet is not active.';
  end if;

  update public.wallets
  set balance = balance - v_total
  where id = v_customer_wallet.id
    and balance >= v_total
  returning * into v_customer_wallet;

  if not found then
    raise exception 'Customer has insufficient demo balance.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where id = v_agent_wallet.id
  returning * into v_agent_wallet;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    sender_wallet_id,
    receiver_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    'cash_out',
    v_customer_wallet.id,
    v_agent_wallet.id,
    v_amount,
    v_fee,
    v_total,
    'completed',
    'Agent cash-out simulation - No real cash is dispensed',
    jsonb_build_object(
      'sender_user_id', p_customer_user_id,
      'receiver_user_id', v_agent_user_id,
      'agent_id', v_agent.id,
      'agent_user_id', v_agent_user_id,
      'agent_code', v_agent.agent_code,
      'agent_name', v_agent_profile.full_name,
      'agent_location', v_agent.location,
      'customer_user_id', p_customer_user_id,
      'customer_name', v_customer_profile.full_name,
      'channel', 'agent_cash_out',
      'simulation_only', true,
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  perform public.add_notification(v_agent_user_id, 'Agent cash-out completed', 'You processed a simulated cash-out for ' || v_customer_profile.full_name || '.', 'agent_cash_out');
  perform public.add_notification(p_customer_user_id, 'Demo cash-out processed', v_agent_profile.full_name || ' processed a simulated cash-out. No real cash was dispensed.', 'cash_out_completed');
  perform public.add_audit_log(v_agent_user_id, 'agent_cash_out', 'transactions', v_tx.id::text, jsonb_build_object('customer_id', p_customer_user_id, 'amount', v_amount, 'fee', v_fee, 'idempotency_key', v_idempotency_key));

  return v_tx;
exception
  when unique_violation then
    select * into v_existing from public.transactions where idempotency_key = v_idempotency_key;
    if found and v_existing.metadata->>'agent_user_id' = v_agent_user_id::text then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.add_demo_money(
  p_amount numeric,
  p_source text,
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_profile public.profiles%rowtype;
  v_existing public.transactions%rowtype;
  v_existing_receiver_user_id uuid;
  v_today_total numeric(14,2);
  v_daily_limit numeric(14,2) := 20000;
  v_amount numeric(14,2);
  v_source text;
  v_idempotency_key text;
  v_tx public.transactions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_amount is null then
    raise exception 'Use a predefined demo amount.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount not in (500, 1000, 2000, 5000) or v_amount <> p_amount then
    raise exception 'Use a predefined demo amount.';
  end if;

  v_source := trim(coalesce(p_source, ''));
  if v_source not in ('Nova Bank Demo', 'Horizon Bank Demo', 'NexaPay Demo Card', 'Demo Balance Faucet') then
    raise exception 'Choose a fictional NexaPay demo funding source.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null or char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'A valid transaction request identifier is required.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_wallet from public.wallets where user_id = v_user_id for update;

  if v_profile.id is null or v_wallet.id is null then
    raise exception 'Demo profile or wallet was not found.';
  end if;

  if v_profile.account_status <> 'active' or v_wallet.status <> 'active' then
    raise exception 'Demo account or wallet is not active.';
  end if;

  select t.*
    into v_existing
  from public.transactions t
  where t.idempotency_key = v_idempotency_key;

  if found then
    select user_id
      into v_existing_receiver_user_id
    from public.wallets
    where id = v_existing.receiver_wallet_id;

    if v_existing_receiver_user_id = v_user_id and v_existing.transaction_type = 'add_money' then
      return v_existing;
    end if;
    raise exception 'Duplicate transaction request identifier.';
  end if;

  select coalesce((value->>'amount')::numeric, 20000)
    into v_daily_limit
  from public.system_settings
  where key = 'demo_daily_add_money_limit';

  v_daily_limit := coalesce(v_daily_limit, 20000);

  select coalesce(sum(amount), 0)
    into v_today_total
  from public.transactions
  where receiver_wallet_id = v_wallet.id
    and transaction_type = 'add_money'
    and status = 'completed'
    and created_at >= date_trunc('day', now());

  if v_today_total + v_amount > v_daily_limit then
    raise exception 'Daily add demo money limit exceeded.';
  end if;

  update public.wallets
  set balance = balance + v_amount
  where id = v_wallet.id;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    receiver_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    'add_money',
    v_wallet.id,
    v_amount,
    0,
    v_amount,
    'completed',
    v_source,
    jsonb_build_object(
      'source', v_source,
      'source_type', case when v_source = 'NexaPay Demo Card' then 'demo_card' when v_source = 'Demo Balance Faucet' then 'demo_faucet' else 'demo_bank' end,
      'notice', 'No real bank or card is connected.',
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  perform public.add_notification(v_user_id, 'Demo money added', 'Fake demo balance was added to your wallet.', 'money_received');
  perform public.add_audit_log(v_user_id, 'add_demo_money', 'transactions', v_tx.id::text, jsonb_build_object('amount', v_amount, 'source', v_source, 'idempotency_key', v_idempotency_key));

  return v_tx;
end;
$$;

create or replace function public.service_payment(
  p_amount numeric,
  p_transaction_type public.transaction_type,
  p_reference text default null,
  p_metadata jsonb default '{}',
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_profile public.profiles%rowtype;
  v_fee numeric(14,2);
  v_total numeric(14,2);
  v_amount numeric(14,2);
  v_reference text;
  v_metadata jsonb := coalesce(p_metadata, '{}');
  v_idempotency_key text;
  v_existing_sender_user_id uuid;
  v_existing public.transactions%rowtype;
  v_tx public.transactions%rowtype;
  v_operator_id uuid;
  v_operator_name text;
  v_plan_type text;
  v_phone text;
  v_category_id uuid;
  v_category_name text;
  v_provider_id uuid;
  v_provider_name text;
  v_provider_category_id uuid;
  v_account_number text;
  v_bank_id uuid;
  v_bank_name text;
  v_receiver_name text;
  v_organization_id uuid;
  v_organization_name text;
  v_organization_description text;
  v_message text;
  v_notification_title text := 'Demo service completed';
  v_notification_type text := 'payment_completed';
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_transaction_type not in ('recharge', 'bill_payment', 'bank_transfer', 'donation') then
    raise exception 'Unsupported service payment type.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount > 100000 then
    raise exception 'Amount exceeds the maximum demo limit.';
  end if;

  v_reference := nullif(trim(coalesce(p_reference, '')), '');
  if v_reference is not null and char_length(v_reference) > 120 then
    raise exception 'Reference is too long.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null then
    raise exception 'A service request identifier is required.';
  end if;

  if char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'Service request identifier length is invalid.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_wallet from public.wallets where user_id = v_user_id;

  if v_profile.id is null then
    raise exception 'Demo profile was not found.';
  end if;

  if v_wallet.id is null then
    raise exception 'Demo wallet was not found.';
  end if;

  if v_profile.account_status <> 'active' or v_wallet.status <> 'active' then
    raise exception 'Demo account or wallet is not active.';
  end if;

  select * into v_existing from public.transactions where idempotency_key = v_idempotency_key;
  if found then
    select user_id
      into v_existing_sender_user_id
    from public.wallets
    where id = v_existing.sender_wallet_id;

    if v_existing_sender_user_id = v_user_id then
      return v_existing;
    end if;
    raise exception 'Duplicate service request identifier.';
  end if;

  if p_transaction_type = 'recharge' then
    if v_amount < 20 or v_amount > 5000 then
      raise exception 'Recharge amount must be between 20 and 5,000 demo taka.';
    end if;

    v_phone := regexp_replace(coalesce(v_metadata->>'phone', ''), '[[:space:]-]', '', 'g');
    if v_phone !~ '^[0-9]{8,15}$' then
      raise exception 'Enter a valid demo phone number.';
    end if;

    v_plan_type := lower(coalesce(v_metadata->>'plan_type', 'prepaid'));
    if v_plan_type not in ('prepaid', 'postpaid') then
      raise exception 'Choose prepaid or postpaid for the demo recharge.';
    end if;

    begin
      v_operator_id := (v_metadata->>'operator_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Choose an active fictional recharge operator.';
    end;

    select name into v_operator_name
    from public.recharge_operators
    where id = v_operator_id
      and status = 'active';

    if not found then
      raise exception 'Choose an active fictional recharge operator.';
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'service_type', 'mobile_recharge',
      'phone', v_phone,
      'operator_id', v_operator_id,
      'operator_name', v_operator_name,
      'plan_type', v_plan_type,
      'notice', 'No real mobile recharge is performed.'
    );
    v_reference := coalesce(v_reference, v_phone);
    v_notification_title := 'Demo recharge completed';
    v_notification_type := 'recharge_completed';
  elsif p_transaction_type = 'bill_payment' then
    begin
      v_category_id := (v_metadata->>'category_id')::uuid;
      v_provider_id := (v_metadata->>'provider_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Choose a fictional bill category and provider.';
    end;

    select name into v_category_name
    from public.bill_categories
    where id = v_category_id
      and status = 'active';

    if not found then
      raise exception 'Choose an active fictional bill category.';
    end if;

    select name, category_id into v_provider_name, v_provider_category_id
    from public.bill_providers
    where id = v_provider_id
      and status = 'active';

    if not found or v_provider_category_id <> v_category_id then
      raise exception 'Choose a provider from the selected fictional bill category.';
    end if;

    v_account_number := trim(coalesce(v_metadata->>'demo_account_number', v_reference, ''));
    if v_account_number !~ '^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$' then
      raise exception 'Enter a valid fictional bill account number.';
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'service_type', 'bill_payment',
      'category_id', v_category_id,
      'category_name', v_category_name,
      'provider_id', v_provider_id,
      'provider_name', v_provider_name,
      'demo_account_number', v_account_number,
      'notice', 'No real bill-payment system is connected.'
    );
    v_reference := coalesce(v_reference, v_account_number);
    v_notification_title := 'Demo bill payment completed';
    v_notification_type := 'bill_payment_completed';
  elsif p_transaction_type = 'bank_transfer' then
    begin
      v_bank_id := (v_metadata->>'bank_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Choose an active fictional demo bank.';
    end;

    select name into v_bank_name
    from public.banks
    where id = v_bank_id
      and status = 'active';

    if not found then
      raise exception 'Choose an active fictional demo bank.';
    end if;

    v_account_number := trim(coalesce(v_metadata->>'fictional_account_number', ''));
    if v_account_number !~ '^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$' then
      raise exception 'Enter a valid fictional bank account number.';
    end if;

    v_receiver_name := trim(coalesce(v_metadata->>'receiver_name', ''));
    if char_length(v_receiver_name) < 2 or char_length(v_receiver_name) > 80 then
      raise exception 'Enter a fictional receiver name between 2 and 80 characters.';
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'service_type', 'bank_transfer',
      'bank_id', v_bank_id,
      'bank_name', v_bank_name,
      'fictional_account_number', v_account_number,
      'receiver_name', v_receiver_name,
      'notice', 'No real bank account is contacted.'
    );
    v_reference := coalesce(v_reference, 'Demo Bank Transfer');
    v_notification_title := 'Demo bank transfer completed';
    v_notification_type := 'bank_transfer_completed';
  elsif p_transaction_type = 'donation' then
    begin
      v_organization_id := (v_metadata->>'organization_id')::uuid;
    exception when invalid_text_representation then
      raise exception 'Choose an active fictional donation organization.';
    end;

    select name, description into v_organization_name, v_organization_description
    from public.donation_organizations
    where id = v_organization_id
      and status = 'active';

    if not found then
      raise exception 'Choose an active fictional donation organization.';
    end if;

    v_message := trim(coalesce(v_metadata->>'message', ''));
    if char_length(v_message) > 240 then
      raise exception 'Donation message is too long.';
    end if;

    v_metadata := v_metadata || jsonb_build_object(
      'service_type', 'donation',
      'organization_id', v_organization_id,
      'organization_name', v_organization_name,
      'organization_description', coalesce(v_organization_description, ''),
      'message', v_message,
      'notice', 'All organizations are fictional demo entities.'
    );
    v_reference := coalesce(v_reference, v_organization_name);
    v_notification_title := 'Demo donation completed';
    v_notification_type := 'donation_completed';
  end if;

  select * into v_wallet from public.wallets where id = v_wallet.id for update;

  if v_wallet.status <> 'active' then
    raise exception 'Demo wallet is not active.';
  end if;

  v_fee := public.demo_fee(p_transaction_type, v_amount);
  v_total := v_amount + v_fee;

  if v_wallet.balance < v_total then
    raise exception 'Insufficient demo balance.';
  end if;

  update public.wallets
  set balance = balance - v_total,
      updated_at = now()
  where id = v_wallet.id
    and balance >= v_total
  returning * into v_wallet;

  if not found then
    raise exception 'Insufficient demo balance.';
  end if;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    sender_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    p_transaction_type,
    v_wallet.id,
    v_amount,
    v_fee,
    v_total,
    'completed',
    v_reference,
    v_metadata || jsonb_build_object(
      'sender_user_id', v_user_id,
      'sender_name', v_profile.full_name,
      'simulation_only', true,
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  perform public.add_notification(v_user_id, v_notification_title, 'Your simulated service transaction was completed.', v_notification_type);
  perform public.add_audit_log(v_user_id, 'service_payment', 'transactions', v_tx.id::text, jsonb_build_object('type', p_transaction_type, 'amount', v_amount, 'fee', v_fee, 'idempotency_key', v_idempotency_key));

  return v_tx;
end;
$$;

alter table public.money_requests
add column if not exists idempotency_key text;

create unique index if not exists idx_money_requests_idempotency_key_unique
on public.money_requests (idempotency_key)
where idempotency_key is not null;

create or replace function public.create_demo_money_request(
  p_receiver_user_id uuid,
  p_amount numeric,
  p_note text default null,
  p_idempotency_key text default null
)
returns public.money_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_user_id uuid := auth.uid();
  v_sender_profile public.profiles%rowtype;
  v_receiver_profile public.profiles%rowtype;
  v_sender_wallet public.wallets%rowtype;
  v_receiver_wallet public.wallets%rowtype;
  v_amount numeric(14,2);
  v_note text;
  v_idempotency_key text;
  v_existing public.money_requests%rowtype;
  v_request public.money_requests%rowtype;
begin
  if v_sender_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_receiver_user_id is null then
    raise exception 'Choose a registered demo user.';
  end if;

  if p_receiver_user_id = v_sender_user_id then
    raise exception 'You cannot request demo money from yourself.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Request amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount < 1 then
    raise exception 'Request amount must be at least 1 demo taka.';
  end if;

  if v_amount > 100000 then
    raise exception 'Request amount exceeds the maximum demo limit.';
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 240 then
    raise exception 'Request note is too long.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null then
    raise exception 'A request identifier is required.';
  end if;

  if char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'Request identifier length is invalid.';
  end if;

  select * into v_existing
  from public.money_requests
  where idempotency_key = v_idempotency_key;

  if found then
    if v_existing.sender_id = v_sender_user_id then
      return v_existing;
    end if;
    raise exception 'Duplicate request identifier.';
  end if;

  select * into v_sender_profile from public.profiles where id = v_sender_user_id;
  select * into v_receiver_profile from public.profiles where id = p_receiver_user_id;

  if v_sender_profile.id is null then
    raise exception 'Requester profile was not found.';
  end if;

  if v_receiver_profile.id is null then
    raise exception 'Receiver profile was not found.';
  end if;

  if v_sender_profile.role <> 'customer' or v_receiver_profile.role <> 'customer' then
    raise exception 'Money requests are only available between customer demo accounts.';
  end if;

  if v_sender_profile.account_status <> 'active' then
    raise exception 'Requester account is not active.';
  end if;

  if v_receiver_profile.account_status <> 'active' then
    raise exception 'Receiver account is not active.';
  end if;

  select * into v_sender_wallet from public.wallets where user_id = v_sender_user_id;
  select * into v_receiver_wallet from public.wallets where user_id = p_receiver_user_id;

  if v_sender_wallet.id is null or v_sender_wallet.status <> 'active' then
    raise exception 'Requester wallet is not active.';
  end if;

  if v_receiver_wallet.id is null or v_receiver_wallet.status <> 'active' then
    raise exception 'Receiver wallet is not active.';
  end if;

  insert into public.money_requests (
    sender_id,
    receiver_id,
    amount,
    note,
    status,
    idempotency_key
  )
  values (
    v_sender_user_id,
    p_receiver_user_id,
    v_amount,
    v_note,
    'pending',
    v_idempotency_key
  )
  returning * into v_request;

  perform public.add_notification(
    p_receiver_user_id,
    'Demo money request received',
    v_sender_profile.full_name || ' requested simulated NexaPay demo money.',
    'request_received'
  );
  perform public.add_audit_log(
    v_sender_user_id,
    'create_money_request',
    'money_requests',
    v_request.id::text,
    jsonb_build_object('amount', v_amount, 'receiver_id', p_receiver_user_id, 'idempotency_key', v_idempotency_key)
  );

  return v_request;
exception
  when unique_violation then
    select * into v_existing
    from public.money_requests
    where idempotency_key = v_idempotency_key;

    if found and v_existing.sender_id = v_sender_user_id then
      return v_existing;
    end if;
    raise;
end;
$$;

create or replace function public.list_demo_money_requests()
returns table (
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  amount numeric,
  note text,
  status public.request_status,
  idempotency_key text,
  created_at timestamptz,
  updated_at timestamptz,
  sender_name text,
  sender_phone text,
  receiver_name text,
  receiver_phone text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    mr.id,
    mr.sender_id,
    mr.receiver_id,
    mr.amount,
    mr.note,
    mr.status,
    mr.idempotency_key,
    mr.created_at,
    mr.updated_at,
    sender.full_name as sender_name,
    sender.phone as sender_phone,
    receiver.full_name as receiver_name,
    receiver.phone as receiver_phone
  from public.money_requests mr
  join public.profiles sender on sender.id = mr.sender_id
  join public.profiles receiver on receiver.id = mr.receiver_id
  where auth.uid() is not null
    and (mr.sender_id = auth.uid() or mr.receiver_id = auth.uid() or public.is_admin())
  order by mr.created_at desc
  limit 100;
$$;

create or replace function public.respond_money_request(
  p_request_id uuid,
  p_accept boolean,
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.money_requests%rowtype;
  v_tx public.transactions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select * into v_request
  from public.money_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Money request was not found.';
  end if;

  if v_request.receiver_id <> v_user_id then
    raise exception 'Only the receiver can respond to this request.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This request is not pending.';
  end if;

  if not p_accept then
    update public.money_requests
    set status = 'declined',
        updated_at = now()
    where id = p_request_id;
    perform public.add_notification(v_request.sender_id, 'Demo request declined', 'Your request was declined.', 'request_declined');
    perform public.add_audit_log(v_user_id, 'decline_money_request', 'money_requests', p_request_id::text);
    return null;
  end if;

  v_tx := public.transfer_demo_money(
    v_request.sender_id,
    v_request.amount,
    v_request.note,
    'request_money',
    jsonb_build_object('request_id', v_request.id),
    coalesce(p_idempotency_key, 'request:' || v_request.id::text)
  );

  update public.money_requests
  set status = 'accepted',
      updated_at = now()
  where id = p_request_id;

  perform public.add_notification(v_request.sender_id, 'Demo request accepted', 'Your request was accepted.', 'request_accepted');
  perform public.add_audit_log(v_user_id, 'accept_money_request', 'money_requests', p_request_id::text, jsonb_build_object('transaction_id', v_tx.transaction_id));
  return v_tx;
end;
$$;

create or replace function public.cancel_demo_money_request(
  p_request_id uuid
)
returns public.money_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.money_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select * into v_request
  from public.money_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Money request was not found.';
  end if;

  if v_request.sender_id <> v_user_id then
    raise exception 'Only the requester can cancel this request.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending requests can be cancelled.';
  end if;

  update public.money_requests
  set status = 'cancelled',
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  perform public.add_notification(v_request.receiver_id, 'Demo request cancelled', 'A pending demo money request was cancelled.', 'request_cancelled');
  perform public.add_audit_log(v_user_id, 'cancel_money_request', 'money_requests', p_request_id::text);

  return v_request;
end;
$$;

create or replace function public.create_savings_goal(
  p_title text,
  p_target_amount numeric,
  p_target_date date
)
returns public.savings_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_title text;
  v_target_amount numeric(14,2);
  v_goal public.savings_goals%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 2 or char_length(v_title) > 120 then
    raise exception 'Savings title must be 2 to 120 characters.';
  end if;

  if p_target_amount is null or p_target_amount <= 0 then
    raise exception 'Target amount must be greater than zero.';
  end if;

  v_target_amount := round(p_target_amount, 2);
  if v_target_amount <> p_target_amount then
    raise exception 'Target amount can use at most two decimal places.';
  end if;

  if v_target_amount > 1000000 then
    raise exception 'The maximum demo savings target is 1,000,000.';
  end if;

  if p_target_date is null then
    raise exception 'Choose a target date.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if v_profile.id is null or v_profile.account_status <> 'active' then
    raise exception 'Demo account is not active.';
  end if;

  insert into public.savings_goals (
    user_id,
    title,
    target_amount,
    current_amount,
    target_date,
    status
  )
  values (
    v_user_id,
    v_title,
    v_target_amount,
    0,
    p_target_date,
    'active'
  )
  returning * into v_goal;

  perform public.add_audit_log(v_user_id, 'create_savings_goal', 'savings_goals', v_goal.id::text, jsonb_build_object('target_amount', v_target_amount));

  return v_goal;
end;
$$;

create or replace function public.move_savings_goal_money(
  p_goal_id uuid,
  p_amount numeric,
  p_direction text,
  p_note text default null,
  p_idempotency_key text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_wallet public.wallets%rowtype;
  v_goal public.savings_goals%rowtype;
  v_amount numeric(14,2);
  v_direction text;
  v_note text;
  v_idempotency_key text;
  v_existing public.transactions%rowtype;
  v_existing_user_id uuid;
  v_tx public.transactions%rowtype;
  v_entry public.savings_goal_entries%rowtype;
  v_new_goal_amount numeric(14,2);
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_idempotency_key is null then
    raise exception 'A savings request identifier is required.';
  end if;

  if char_length(v_idempotency_key) < 16 or char_length(v_idempotency_key) > 180 then
    raise exception 'Savings request identifier length is invalid.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  v_amount := round(p_amount, 2);
  if v_amount <> p_amount then
    raise exception 'Amount can use at most two decimal places.';
  end if;

  if v_amount > 100000 then
    raise exception 'The maximum demo savings movement is 100,000.';
  end if;

  v_direction := lower(trim(coalesce(p_direction, '')));
  if v_direction not in ('deposit', 'withdrawal') then
    raise exception 'Choose deposit or withdrawal.';
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 240 then
    raise exception 'Savings note is too long.';
  end if;

  select * into v_existing
  from public.transactions
  where idempotency_key = v_idempotency_key;

  if found then
    select user_id into v_existing_user_id
    from public.wallets
    where id = coalesce(v_existing.sender_wallet_id, v_existing.receiver_wallet_id);

    if v_existing_user_id = v_user_id then
      return v_existing;
    end if;
    raise exception 'Duplicate savings request identifier.';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_wallet from public.wallets where user_id = v_user_id for update;
  select * into v_goal
  from public.savings_goals
  where id = p_goal_id
    and user_id = v_user_id
  for update;

  if v_profile.id is null or v_profile.account_status <> 'active' then
    raise exception 'Demo account is not active.';
  end if;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Demo wallet is not active.';
  end if;

  if v_goal.id is null then
    raise exception 'Savings goal was not found.';
  end if;

  if v_goal.status = 'cancelled' then
    raise exception 'This savings goal is cancelled.';
  end if;

  if v_direction = 'deposit' then
    if v_wallet.balance < v_amount then
      raise exception 'Insufficient demo balance.';
    end if;

    if v_goal.current_amount + v_amount > v_goal.target_amount then
      raise exception 'Deposit exceeds the remaining target amount.';
    end if;

    update public.wallets
    set balance = balance - v_amount,
        updated_at = now()
    where id = v_wallet.id
      and balance >= v_amount
    returning * into v_wallet;

    if not found then
      raise exception 'Insufficient demo balance.';
    end if;

    v_new_goal_amount := v_goal.current_amount + v_amount;
  else
    if v_goal.current_amount < v_amount then
      raise exception 'Insufficient demo savings.';
    end if;

    update public.wallets
    set balance = balance + v_amount,
        updated_at = now()
    where id = v_wallet.id
    returning * into v_wallet;

    v_new_goal_amount := v_goal.current_amount - v_amount;
  end if;

  update public.savings_goals
  set current_amount = v_new_goal_amount,
      status = case when v_new_goal_amount >= target_amount then 'completed' else 'active' end
  where id = v_goal.id
  returning * into v_goal;

  insert into public.transactions (
    transaction_id,
    transaction_type,
    sender_wallet_id,
    receiver_wallet_id,
    amount,
    fee,
    total_amount,
    status,
    reference,
    metadata,
    idempotency_key
  )
  values (
    public.create_demo_transaction_id(),
    case when v_direction = 'deposit' then 'savings_deposit'::public.transaction_type else 'savings_withdrawal'::public.transaction_type end,
    case when v_direction = 'deposit' then v_wallet.id else null end,
    case when v_direction = 'withdrawal' then v_wallet.id else null end,
    v_amount,
    0,
    v_amount,
    'completed',
    v_goal.title,
    jsonb_build_object(
      'sender_user_id', case when v_direction = 'deposit' then v_user_id else null end,
      'receiver_user_id', case when v_direction = 'withdrawal' then v_user_id else null end,
      'sender_name', v_profile.full_name,
      'receiver_name', v_profile.full_name,
      'savings_goal_id', v_goal.id,
      'savings_goal_title', v_goal.title,
      'savings_direction', v_direction,
      'note', coalesce(v_note, ''),
      'simulation_only', true,
      'educational_demo', true
    ),
    v_idempotency_key
  )
  returning * into v_tx;

  insert into public.savings_goal_entries (
    goal_id,
    transaction_id,
    entry_type,
    amount,
    note
  )
  values (
    v_goal.id,
    v_tx.id,
    v_direction,
    v_amount,
    v_note
  )
  returning * into v_entry;

  perform public.add_notification(
    v_user_id,
    case when v_direction = 'deposit' then 'Savings deposit completed' else 'Savings withdrawal completed' end,
    v_goal.title || ' was updated with simulated savings.',
    'savings_updated'
  );
  perform public.add_audit_log(v_user_id, 'move_savings_goal_money', 'transactions', v_tx.id::text, jsonb_build_object('goal_id', v_goal.id, 'direction', v_direction, 'amount', v_amount, 'entry_id', v_entry.id, 'idempotency_key', v_idempotency_key));

  return v_tx;
end;
$$;

create or replace function public.admin_set_profile_status(
  p_profile_id uuid,
  p_status public.account_status
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can manage account status.';
  end if;

  if p_profile_id = v_actor_id and p_status = 'suspended' then
    raise exception 'Admins cannot suspend their own active admin account.';
  end if;

  update public.profiles
  set account_status = p_status,
      updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile was not found.';
  end if;

  perform public.add_audit_log(
    v_actor_id,
    'admin_set_account_status',
    'profiles',
    p_profile_id::text,
    jsonb_build_object('status', p_status)
  );

  return v_profile;
end;
$$;

create or replace function public.admin_set_managed_status(
  p_entity_type text,
  p_entity_id uuid,
  p_status public.account_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_entity text := lower(trim(coalesce(p_entity_type, '')));
  v_result jsonb;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can manage platform content.';
  end if;

  if v_entity = 'merchants' then
    update public.merchants set status = p_status where id = p_entity_id returning to_jsonb(merchants.*) into v_result;
  elsif v_entity = 'agents' then
    update public.agents set status = p_status where id = p_entity_id returning to_jsonb(agents.*) into v_result;
  elsif v_entity = 'service_categories' then
    update public.service_categories set status = p_status where id = p_entity_id returning to_jsonb(service_categories.*) into v_result;
  elsif v_entity = 'recharge_operators' then
    update public.recharge_operators set status = p_status where id = p_entity_id returning to_jsonb(recharge_operators.*) into v_result;
  elsif v_entity = 'bill_categories' then
    update public.bill_categories set status = p_status where id = p_entity_id returning to_jsonb(bill_categories.*) into v_result;
  elsif v_entity = 'bill_providers' then
    update public.bill_providers set status = p_status where id = p_entity_id returning to_jsonb(bill_providers.*) into v_result;
  elsif v_entity = 'banks' then
    update public.banks set status = p_status where id = p_entity_id returning to_jsonb(banks.*) into v_result;
  elsif v_entity = 'donation_organizations' then
    update public.donation_organizations set status = p_status where id = p_entity_id returning to_jsonb(donation_organizations.*) into v_result;
  elsif v_entity = 'promotions' then
    update public.promotions set status = p_status where id = p_entity_id returning to_jsonb(promotions.*) into v_result;
  else
    raise exception 'Unsupported admin-managed entity type.';
  end if;

  if v_result is null then
    raise exception 'Managed record was not found.';
  end if;

  perform public.add_audit_log(
    v_actor_id,
    'admin_set_managed_status',
    v_entity,
    p_entity_id::text,
    jsonb_build_object('status', p_status)
  );

  return v_result;
end;
$$;

create or replace function public.admin_save_managed_item(
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_entity text := lower(trim(coalesce(p_entity_type, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_name text := trim(coalesce(v_payload->>'name', ''));
  v_status public.account_status := coalesce(nullif(v_payload->>'status', '')::public.account_status, 'active');
  v_result jsonb;
  v_category_id uuid;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can manage platform content.';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Managed content name is required.';
  end if;

  if v_entity = 'service_categories' then
    if p_entity_id is null then
      insert into public.service_categories (name, icon, status)
      values (v_name, nullif(trim(coalesce(v_payload->>'icon', '')), ''), v_status)
      returning to_jsonb(service_categories.*) into v_result;
    else
      update public.service_categories
      set name = v_name,
          icon = nullif(trim(coalesce(v_payload->>'icon', '')), ''),
          status = v_status
      where id = p_entity_id
      returning to_jsonb(service_categories.*) into v_result;
    end if;
  elsif v_entity = 'recharge_operators' then
    if p_entity_id is null then
      insert into public.recharge_operators (name, logo_url, status)
      values (v_name, nullif(trim(coalesce(v_payload->>'logo_url', '')), ''), v_status)
      returning to_jsonb(recharge_operators.*) into v_result;
    else
      update public.recharge_operators
      set name = v_name,
          logo_url = nullif(trim(coalesce(v_payload->>'logo_url', '')), ''),
          status = v_status
      where id = p_entity_id
      returning to_jsonb(recharge_operators.*) into v_result;
    end if;
  elsif v_entity = 'bill_categories' then
    if p_entity_id is null then
      insert into public.bill_categories (name, icon, status)
      values (v_name, nullif(trim(coalesce(v_payload->>'icon', '')), ''), v_status)
      returning to_jsonb(bill_categories.*) into v_result;
    else
      update public.bill_categories
      set name = v_name,
          icon = nullif(trim(coalesce(v_payload->>'icon', '')), ''),
          status = v_status
      where id = p_entity_id
      returning to_jsonb(bill_categories.*) into v_result;
    end if;
  elsif v_entity = 'bill_providers' then
    v_category_id := nullif(v_payload->>'category_id', '')::uuid;
    if v_category_id is null then
      raise exception 'Choose a bill category for this provider.';
    end if;

    if p_entity_id is null then
      insert into public.bill_providers (category_id, name, logo_url, status)
      values (v_category_id, v_name, nullif(trim(coalesce(v_payload->>'logo_url', '')), ''), v_status)
      returning to_jsonb(bill_providers.*) into v_result;
    else
      update public.bill_providers
      set category_id = v_category_id,
          name = v_name,
          logo_url = nullif(trim(coalesce(v_payload->>'logo_url', '')), ''),
          status = v_status
      where id = p_entity_id
      returning to_jsonb(bill_providers.*) into v_result;
    end if;
  elsif v_entity = 'banks' then
    if p_entity_id is null then
      insert into public.banks (name, status)
      values (v_name, v_status)
      returning to_jsonb(banks.*) into v_result;
    else
      update public.banks
      set name = v_name,
          status = v_status
      where id = p_entity_id
      returning to_jsonb(banks.*) into v_result;
    end if;
  elsif v_entity = 'donation_organizations' then
    if p_entity_id is null then
      insert into public.donation_organizations (name, description, status)
      values (v_name, nullif(trim(coalesce(v_payload->>'description', '')), ''), v_status)
      returning to_jsonb(donation_organizations.*) into v_result;
    else
      update public.donation_organizations
      set name = v_name,
          description = nullif(trim(coalesce(v_payload->>'description', '')), ''),
          status = v_status
      where id = p_entity_id
      returning to_jsonb(donation_organizations.*) into v_result;
    end if;
  else
    raise exception 'Unsupported admin-managed entity type.';
  end if;

  if v_result is null then
    raise exception 'Managed record was not found.';
  end if;

  perform public.add_audit_log(
    v_actor_id,
    case when p_entity_id is null then 'admin_create_content' else 'admin_update_content' end,
    v_entity,
    coalesce(p_entity_id::text, v_result->>'id'),
    jsonb_build_object('payload', v_payload)
  );

  return v_result;
end;
$$;

create or replace function public.admin_save_promotion(
  p_promotion_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_title text := trim(coalesce(v_payload->>'title', ''));
  v_status public.account_status := coalesce(nullif(v_payload->>'status', '')::public.account_status, 'active');
  v_start_date date := nullif(v_payload->>'start_date', '')::date;
  v_end_date date := nullif(v_payload->>'end_date', '')::date;
  v_result jsonb;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can manage promotions.';
  end if;

  if char_length(v_title) < 2 or char_length(v_title) > 140 then
    raise exception 'Promotion title must be 2 to 140 characters.';
  end if;

  if v_start_date is not null and v_end_date is not null and v_end_date < v_start_date then
    raise exception 'Promotion end date cannot be before start date.';
  end if;

  if p_promotion_id is null then
    insert into public.promotions (title, description, image_url, link, status, start_date, end_date)
    values (
      v_title,
      nullif(trim(coalesce(v_payload->>'description', '')), ''),
      nullif(trim(coalesce(v_payload->>'image_url', '')), ''),
      nullif(trim(coalesce(v_payload->>'link', '')), ''),
      v_status,
      v_start_date,
      v_end_date
    )
    returning to_jsonb(promotions.*) into v_result;
  else
    update public.promotions
    set title = v_title,
        description = nullif(trim(coalesce(v_payload->>'description', '')), ''),
        image_url = nullif(trim(coalesce(v_payload->>'image_url', '')), ''),
        link = nullif(trim(coalesce(v_payload->>'link', '')), ''),
        status = v_status,
        start_date = v_start_date,
        end_date = v_end_date
    where id = p_promotion_id
    returning to_jsonb(promotions.*) into v_result;
  end if;

  if v_result is null then
    raise exception 'Promotion was not found.';
  end if;

  perform public.add_audit_log(
    v_actor_id,
    case when p_promotion_id is null then 'admin_create_promotion' else 'admin_update_promotion' end,
    'promotions',
    coalesce(p_promotion_id::text, v_result->>'id'),
    jsonb_build_object('payload', v_payload)
  );

  return v_result;
end;
$$;

create or replace function public.admin_create_announcement(
  p_title text,
  p_message text,
  p_target_role public.account_role default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_message text := trim(coalesce(p_message, ''));
  v_count integer;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can create announcements.';
  end if;

  if char_length(v_title) < 2 or char_length(v_title) > 120 then
    raise exception 'Announcement title must be 2 to 120 characters.';
  end if;

  if char_length(v_message) < 2 or char_length(v_message) > 500 then
    raise exception 'Announcement message must be 2 to 500 characters.';
  end if;

  insert into public.notifications (user_id, title, message, type, is_read)
  select p.id, v_title, v_message, 'admin_announcement', false
  from public.profiles p
  where p.account_status = 'active'
    and (p_target_role is null or p.role = p_target_role);

  get diagnostics v_count = row_count;

  perform public.add_audit_log(
    v_actor_id,
    'admin_create_announcement',
    'notifications',
    coalesce(p_target_role::text, 'all'),
    jsonb_build_object('title', v_title, 'target_role', p_target_role, 'recipient_count', v_count)
  );

  return v_count;
end;
$$;

create or replace function public.admin_update_system_setting(
  p_key text,
  p_value jsonb
)
returns public.system_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_key text := trim(coalesce(p_key, ''));
  v_setting public.system_settings%rowtype;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Only an active admin can update system settings.';
  end if;

  if v_key = '' then
    raise exception 'Setting key is required.';
  end if;

  if p_value is null then
    raise exception 'Setting value is required.';
  end if;

  insert into public.system_settings (key, value, updated_at)
  values (v_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now()
  returning * into v_setting;

  perform public.add_audit_log(
    v_actor_id,
    'admin_update_system_setting',
    'system_settings',
    v_key,
    jsonb_build_object('value', p_value)
  );

  return v_setting;
end;
$$;

revoke all on function public.transfer_demo_money(uuid, numeric, text, public.transaction_type, jsonb, text) from public;
revoke all on function public.create_demo_money_request(uuid, numeric, text, text) from public;
revoke all on function public.list_demo_money_requests() from public;
revoke all on function public.respond_money_request(uuid, boolean, text) from public;
revoke all on function public.cancel_demo_money_request(uuid) from public;
revoke all on function public.search_demo_merchants(text) from public;
revoke all on function public.get_demo_merchant_by_qr(text) from public;
revoke all on function public.search_demo_agents(text) from public;
revoke all on function public.cash_out_demo_money(uuid, numeric, text) from public;
revoke all on function public.agent_cash_in_demo_money(uuid, numeric, text) from public;
revoke all on function public.agent_cash_out_demo_money(uuid, numeric, text) from public;
revoke all on function public.add_demo_money(numeric, text, text) from public;
revoke all on function public.service_payment(numeric, public.transaction_type, text, jsonb, text) from public;
revoke all on function public.create_savings_goal(text, numeric, date) from public;
revoke all on function public.move_savings_goal_money(uuid, numeric, text, text, text) from public;
revoke all on function public.search_demo_profiles(text) from public;
revoke all on function public.list_demo_favorites() from public;
revoke all on function public.admin_set_profile_status(uuid, public.account_status) from public;
revoke all on function public.admin_set_managed_status(text, uuid, public.account_status) from public;
revoke all on function public.admin_save_managed_item(text, uuid, jsonb) from public;
revoke all on function public.admin_save_promotion(uuid, jsonb) from public;
revoke all on function public.admin_create_announcement(text, text, public.account_role) from public;
revoke all on function public.admin_update_system_setting(text, jsonb) from public;
grant execute on function public.transfer_demo_money(uuid, numeric, text, public.transaction_type, jsonb, text) to authenticated;
grant execute on function public.create_demo_money_request(uuid, numeric, text, text) to authenticated;
grant execute on function public.list_demo_money_requests() to authenticated;
grant execute on function public.add_demo_money(numeric, text, text) to authenticated;
grant execute on function public.service_payment(numeric, public.transaction_type, text, jsonb, text) to authenticated;
grant execute on function public.create_savings_goal(text, numeric, date) to authenticated;
grant execute on function public.move_savings_goal_money(uuid, numeric, text, text, text) to authenticated;
grant execute on function public.respond_money_request(uuid, boolean, text) to authenticated;
grant execute on function public.cancel_demo_money_request(uuid) to authenticated;
grant execute on function public.search_demo_profiles(text) to authenticated;
grant execute on function public.list_demo_favorites() to authenticated;
grant execute on function public.search_demo_merchants(text) to authenticated;
grant execute on function public.get_demo_merchant_by_qr(text) to authenticated;
grant execute on function public.search_demo_agents(text) to authenticated;
grant execute on function public.cash_out_demo_money(uuid, numeric, text) to authenticated;
grant execute on function public.agent_cash_in_demo_money(uuid, numeric, text) to authenticated;
grant execute on function public.agent_cash_out_demo_money(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_profile_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_set_managed_status(text, uuid, public.account_status) to authenticated;
grant execute on function public.admin_save_managed_item(text, uuid, jsonb) to authenticated;
grant execute on function public.admin_save_promotion(uuid, jsonb) to authenticated;
grant execute on function public.admin_create_announcement(text, text, public.account_role) to authenticated;
grant execute on function public.admin_update_system_setting(text, jsonb) to authenticated;
