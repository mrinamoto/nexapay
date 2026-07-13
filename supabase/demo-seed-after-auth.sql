-- NexaPay demo seed after Auth users exist
-- Educational Demo - No Real Money or Financial Transactions
--
-- This file intentionally does NOT create auth users and does NOT publish passwords.
-- First create demo users in Supabase Dashboard > Authentication > Users.
-- Suggested fictional emails:
--   ava.customer@nexapay.test
--   sami.customer@nexapay.test
--   nova.customer@nexapay.test
--   merchant@nexapay.test
--   agent@nexapay.test
--   admin@nexapay.test
--
-- After those users exist and the trigger creates profiles/wallets, run this file.

update public.profiles
set full_name = 'Ava Rahman', phone = '01710000001', role = 'customer', account_status = 'active'
where email = 'ava.customer@nexapay.test';

update public.profiles
set full_name = 'Sami Karim', phone = '01710000002', role = 'customer', account_status = 'active'
where email = 'sami.customer@nexapay.test';

update public.profiles
set full_name = 'Nova Islam', phone = '01710000003', role = 'customer', account_status = 'active'
where email = 'nova.customer@nexapay.test';

update public.profiles
set full_name = 'Orion Mart Owner', phone = '01710000011', role = 'merchant', account_status = 'active'
where email = 'merchant@nexapay.test';

update public.profiles
set full_name = 'Mira Chowdhury', phone = '01710000021', role = 'agent', account_status = 'active'
where email = 'agent@nexapay.test';

update public.profiles
set full_name = 'Zara Admin', phone = '01710000099', role = 'admin', account_status = 'active'
where email = 'admin@nexapay.test';

update public.wallets w
set balance =
  case p.email
    when 'ava.customer@nexapay.test' then 25000
    when 'sami.customer@nexapay.test' then 32000
    when 'nova.customer@nexapay.test' then 18000
    when 'merchant@nexapay.test' then 74000
    when 'agent@nexapay.test' then 90000
    else w.balance
  end
from public.profiles p
where p.id = w.user_id
  and p.email in (
    'ava.customer@nexapay.test',
    'sami.customer@nexapay.test',
    'nova.customer@nexapay.test',
    'merchant@nexapay.test',
    'agent@nexapay.test'
  );

insert into public.merchants (owner_id, business_name, category, merchant_code, qr_identifier, status)
select id, 'Orion Mart', 'Grocery', 'NPM-1001', 'NEXAPAY:MERCHANT:NPM-1001', 'active'
from public.profiles
where email = 'merchant@nexapay.test'
on conflict (owner_id) do update
set
  business_name = excluded.business_name,
  category = excluded.category,
  merchant_code = excluded.merchant_code,
  qr_identifier = excluded.qr_identifier,
  status = excluded.status;

insert into public.agents (user_id, agent_code, location, status)
select id, 'NPA-2001', 'Banani Demo Point', 'active'
from public.profiles
where email = 'agent@nexapay.test'
on conflict (user_id) do update
set
  agent_code = excluded.agent_code,
  location = excluded.location,
  status = excluded.status;

insert into public.favorites (user_id, favorite_user_id)
select owner.id, favorite.id
from public.profiles owner
join public.profiles favorite on favorite.email in ('sami.customer@nexapay.test', 'nova.customer@nexapay.test', 'merchant@nexapay.test')
where owner.email = 'ava.customer@nexapay.test'
on conflict (user_id, favorite_user_id) do nothing;

insert into public.money_requests (sender_id, receiver_id, amount, note, status)
select ava.id, sami.id, 450, 'Shared transport demo request', 'pending'
from public.profiles ava
join public.profiles sami on sami.email = 'sami.customer@nexapay.test'
where ava.email = 'ava.customer@nexapay.test'
  and not exists (
    select 1
    from public.money_requests mr
    where mr.sender_id = ava.id
      and mr.receiver_id = sami.id
      and mr.note = 'Shared transport demo request'
  );

insert into public.savings_goals (user_id, title, target_amount, current_amount, target_date, status)
select id, 'New Laptop', 100000, 35000, '2026-12-31', 'active'
from public.profiles
where email = 'ava.customer@nexapay.test'
  and not exists (
    select 1
    from public.savings_goals sg
    where sg.user_id = public.profiles.id
      and sg.title = 'New Laptop'
  );

insert into public.savings_goal_entries (goal_id, entry_type, amount, note)
select sg.id, 'deposit', 35000, 'Opening demo savings balance'
from public.savings_goals sg
join public.profiles p on p.id = sg.user_id
where p.email = 'ava.customer@nexapay.test'
  and sg.title = 'New Laptop'
  and not exists (
    select 1
    from public.savings_goal_entries e
    where e.goal_id = sg.id
      and e.note = 'Opening demo savings balance'
  );

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
select
  'NXP-DEMO-SUPA-1001',
  'add_money',
  null,
  ava_wallet.id,
  5000,
  0,
  5000,
  'completed',
  'Demo balance faucet',
  '{"source":"Demo Balance Faucet"}'::jsonb,
  'seed-supa-add-1'
from public.profiles ava
join public.wallets ava_wallet on ava_wallet.user_id = ava.id
where ava.email = 'ava.customer@nexapay.test'
on conflict (transaction_id) do nothing;

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
select
  'NXP-DEMO-SUPA-1002',
  'merchant_payment',
  ava_wallet.id,
  merchant_wallet.id,
  850,
  0,
  850,
  'completed',
  'Groceries',
  '{"merchant_name":"Orion Mart"}'::jsonb,
  'seed-supa-pay-1'
from public.profiles ava
join public.wallets ava_wallet on ava_wallet.user_id = ava.id
join public.profiles merchant on merchant.email = 'merchant@nexapay.test'
join public.wallets merchant_wallet on merchant_wallet.user_id = merchant.id
where ava.email = 'ava.customer@nexapay.test'
on conflict (transaction_id) do nothing;

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
select
  'NXP-DEMO-SUPA-1003',
  'send_money',
  sami_wallet.id,
  ava_wallet.id,
  1200,
  5,
  1205,
  'completed',
  'Project dinner',
  '{}'::jsonb,
  'seed-supa-send-1'
from public.profiles ava
join public.wallets ava_wallet on ava_wallet.user_id = ava.id
join public.profiles sami on sami.email = 'sami.customer@nexapay.test'
join public.wallets sami_wallet on sami_wallet.user_id = sami.id
where ava.email = 'ava.customer@nexapay.test'
on conflict (transaction_id) do nothing;

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
select
  'NXP-DEMO-SUPA-1004',
  'recharge',
  ava_wallet.id,
  null,
  200,
  0,
  200,
  'completed',
  'DemoTel prepaid',
  '{"operator":"DemoTel","phone":"01710000001"}'::jsonb,
  'seed-supa-recharge-1'
from public.profiles ava
join public.wallets ava_wallet on ava_wallet.user_id = ava.id
where ava.email = 'ava.customer@nexapay.test'
on conflict (transaction_id) do nothing;

insert into public.notifications (user_id, title, message, type, is_read)
select id, 'Educational demo active', 'No real money, cards, banks, or payment networks are connected.', 'admin_announcement', false
from public.profiles
where email = 'ava.customer@nexapay.test'
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = public.profiles.id
      and n.title = 'Educational demo active'
  );

insert into public.notifications (user_id, title, message, type, is_read)
select id, 'Demo money received', 'Sami Karim sent you demo currency in NexaPay.', 'money_received', false
from public.profiles
where email = 'ava.customer@nexapay.test'
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = public.profiles.id
      and n.title = 'Demo money received'
  );

insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
select id, 'seed_demo_after_auth', 'system', 'phase-05-demo-seed', '{"educational_demo":true}'::jsonb
from public.profiles
where email = 'admin@nexapay.test'
  and not exists (
    select 1
    from public.audit_logs a
    where a.action = 'seed_demo_after_auth'
      and a.entity_id = 'phase-05-demo-seed'
  );
