# Phase 5 - Supabase Project And Database Schema

This phase creates the Supabase PostgreSQL database foundation for NexaPay.

## What We Built

- Complete PostgreSQL schema
- Primary keys and foreign keys
- Check constraints
- Unique constraints
- Useful indexes
- Profile and wallet auto-creation trigger
- Merchant/agent role-link validation triggers
- Public content seed data
- Safe post-auth demo seed data
- Beginner setup instructions

## Important Safety Note

NexaPay is an educational simulator. Do not use real customer data, real financial credentials, real card data, real bank data, or real OTP systems.

The demo seed files use fictional names and emails only.

## Files Created Or Updated

```text
nexapay/
  supabase/
    migrations/
      001_schema.sql
      002_rpc_functions.sql
      003_rls_policies.sql
    seed.sql
    demo-seed-after-auth.sql
  docs/
    database-schema.md
    phase-05-supabase-database-schema.md
```

## Step 1 - Create A Supabase Project

1. Open [Supabase](https://supabase.com).
2. Click **New project**.
3. Enter project name: `nexapay`.
4. Choose a strong database password.
5. Save that password somewhere private.
6. Choose the free plan if available.
7. Click **Create new project**.
8. Wait until Supabase finishes provisioning.

## Step 2 - Run The Schema SQL

1. Open your Supabase project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/001_schema.sql` in this project.
5. Copy the full SQL.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.

Expected result:

- Supabase shows success.
- Tables appear under **Table Editor**.

## Step 3 - Run Public Seed Data

1. Stay in **SQL Editor**.
2. Click **New query**.
3. Open `supabase/seed.sql`.
4. Copy the full SQL.
5. Paste it into SQL Editor.
6. Click **Run**.

Expected result:

- Service categories are created.
- Fictional recharge operators are created.
- Fictional bill categories and bill providers are created.
- Fictional banks and donation organizations are created.
- Promotional demo banners are created.

## Step 4 - Check The Tables

Open **Table Editor** and confirm these tables exist:

- `profiles`
- `wallets`
- `transactions`
- `money_requests`
- `favorites`
- `merchants`
- `agents`
- `recharge_operators`
- `bill_categories`
- `bill_providers`
- `savings_goals`
- `savings_goal_entries`
- `notifications`
- `promotions`
- `audit_logs`

## Step 5 - Create Demo Auth Users

This step is optional, but useful if you want demo rows for users, wallets, merchants, agents, and transactions.

1. Open **Authentication** in Supabase.
2. Click **Users**.
3. Click **Add user**.
4. Create fictional users with these emails:

```text
ava.customer@nexapay.test
sami.customer@nexapay.test
nova.customer@nexapay.test
merchant@nexapay.test
agent@nexapay.test
admin@nexapay.test
```

Use private demo passwords that you do not commit to GitHub.

The database trigger will automatically create:

- Profile row
- Wallet row
- Welcome notification

New Auth users start as `customer` by default. The post-auth demo seed updates the fictional merchant, agent, and admin accounts to their trusted demo roles.

## Step 6 - Run Demo Seed After Auth

Only run this after creating the demo Auth users.

1. Open **SQL Editor**.
2. Click **New query**.
3. Open `supabase/demo-seed-after-auth.sql`.
4. Copy the full SQL.
5. Paste it into SQL Editor.
6. Click **Run**.

Expected result:

- Demo profiles get correct roles and names.
- Demo wallets get starting balances.
- Merchant and agent rows are created.
- Favorites and money requests are created.
- Savings goal and savings history are created.
- Demo transactions are created.
- Notifications and audit logs are created.

## Step 7 - Verification Queries

Run this query to count the core rows:

```sql
select 'profiles' as table_name, count(*) from public.profiles
union all
select 'wallets', count(*) from public.wallets
union all
select 'transactions', count(*) from public.transactions
union all
select 'money_requests', count(*) from public.money_requests
union all
select 'merchants', count(*) from public.merchants
union all
select 'agents', count(*) from public.agents
union all
select 'savings_goals', count(*) from public.savings_goals
union all
select 'notifications', count(*) from public.notifications
union all
select 'promotions', count(*) from public.promotions
union all
select 'audit_logs', count(*) from public.audit_logs;
```

Run this query to confirm every profile has a wallet:

```sql
select p.email, p.role, w.balance, w.currency, w.status
from public.profiles p
join public.wallets w on w.user_id = p.id
order by p.created_at desc;
```

Run this query to inspect relationships:

```sql
select
  t.transaction_id,
  t.transaction_type,
  sender.email as sender_email,
  receiver.email as receiver_email,
  t.amount,
  t.fee,
  t.total_amount,
  t.status
from public.transactions t
left join public.wallets sw on sw.id = t.sender_wallet_id
left join public.profiles sender on sender.id = sw.user_id
left join public.wallets rw on rw.id = t.receiver_wallet_id
left join public.profiles receiver on receiver.id = rw.user_id
order by t.created_at desc;
```

## Common Errors And Solutions

`relation "auth.users" does not exist`

You are not running the SQL inside Supabase. Use Supabase SQL Editor, not a random local PostgreSQL database.

`Merchant records must be linked to a merchant profile.`

The profile role must be `merchant` before inserting into `merchants`. Run the profile update part of `demo-seed-after-auth.sql` first.

`Agent records must be linked to an agent profile.`

The profile role must be `agent` before inserting into `agents`.

`duplicate key value violates unique constraint`

Most seed scripts are idempotent. If you manually inserted conflicting codes or emails, change the duplicate row or reset the demo database.

`new row for relation "transactions" violates check constraint`

Confirm `total_amount = amount + fee`, and at least one wallet is connected.

## Completion Checklist

- [x] Supabase project setup instructions exist.
- [x] Complete schema exists.
- [x] Relationships are defined with foreign keys.
- [x] Constraints protect invalid data.
- [x] Indexes support common queries.
- [x] Public seed data exists.
- [x] Safe post-auth demo seed data exists.
- [x] Setup instructions avoid publishing real passwords.
