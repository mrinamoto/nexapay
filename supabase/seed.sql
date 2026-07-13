-- NexaPay fictional seed data
-- Run after migrations. This does not create auth users or publish passwords.

insert into public.system_settings (key, value)
values
  ('starting_demo_balance', '{"amount":25000}'),
  ('demo_max_transaction_amount', '{"amount":100000}'),
  ('demo_daily_add_money_limit', '{"amount":20000}')
on conflict (key) do update set value = excluded.value;

insert into public.service_categories (name, icon, status)
values
  ('Send Money', 'send', 'active'),
  ('Request Money', 'request', 'active'),
  ('Merchant Payment', 'payment', 'active'),
  ('Cash Out', 'cash', 'active'),
  ('Recharge', 'phone', 'active'),
  ('Bill Payment', 'bill', 'active'),
  ('Bank Transfer', 'bank', 'active'),
  ('Savings', 'savings', 'active'),
  ('Donation', 'donation', 'active')
on conflict (name) do nothing;

insert into public.recharge_operators (name, status)
values
  ('DemoTel', 'active'),
  ('Nova Mobile', 'active'),
  ('ConnectX', 'active'),
  ('Wave Telecom', 'active')
on conflict (name) do nothing;

insert into public.bill_categories (name, icon, status)
values
  ('Electricity', 'bill', 'active'),
  ('Gas', 'bill', 'active'),
  ('Water', 'bill', 'active'),
  ('Internet', 'bill', 'active'),
  ('Education', 'bill', 'active'),
  ('TV', 'bill', 'active'),
  ('Other', 'bill', 'active')
on conflict (name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'LumenGrid Demo Power', 'active' from public.bill_categories where name = 'Electricity'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'HearthGas Demo Network', 'active' from public.bill_categories where name = 'Gas'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'BlueWater Demo Utility', 'active' from public.bill_categories where name = 'Water'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'FiberLane Demo Internet', 'active' from public.bill_categories where name = 'Internet'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'StudyBridge Demo School', 'active' from public.bill_categories where name = 'Education'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'PrismCast Demo TV', 'active' from public.bill_categories where name = 'TV'
on conflict (category_id, name) do nothing;

insert into public.bill_providers (category_id, name, status)
select id, 'CivicPay Demo Services', 'active' from public.bill_categories where name = 'Other'
on conflict (category_id, name) do nothing;

insert into public.banks (name, status)
values
  ('Nova Bank', 'active'),
  ('Horizon Bank', 'active'),
  ('Unity Bank', 'active')
on conflict (name) do nothing;

insert into public.donation_organizations (name, description, status)
values
  ('Future Learners Fund', 'Fictional demo education fund', 'active'),
  ('Green Steps Collective', 'Fictional demo environment group', 'active'),
  ('Open Care Mission', 'Fictional demo health support', 'active')
on conflict (name) do nothing;

insert into public.promotions (title, description, link, status, start_date, end_date)
values
  (
    'Practice safe demo transfers',
    'Try NexaPay Send Money with fictional users and receipts.',
    'pages/customer/send-money.html',
    'active',
    '2026-01-01',
    '2026-12-31'
  ),
  (
    'Build confidence with demo bills',
    'Explore recharge, bill payment, and bank transfer without real providers.',
    'pages/customer/bills.html',
    'active',
    '2026-01-01',
    '2026-12-31'
  ),
  (
    'Grow a fictional savings goal',
    'Practice savings deposits and withdrawals with fake demo currency.',
    'pages/customer/savings.html',
    'active',
    '2026-01-01',
    '2026-12-31'
  )
on conflict (title, start_date) do update
set
  description = excluded.description,
  link = excluded.link,
  status = excluded.status,
  end_date = excluded.end_date;
