# Phase 12 - Savings And Donation Features

## What We Built

Phase 12 adds portfolio-grade educational versions of:

- Savings goals
- Target amounts
- Progress tracking
- Savings deposits
- Savings withdrawals
- Savings history entries
- Fictional donation organizations
- Donation transactions
- Demo receipts

All balances and transactions are fake demo currency.

## Why This Is Needed

Savings and donation flows teach two important wallet patterns:

- Moving money inside a user-owned sub-ledger, such as a savings goal.
- Paying a fictional service destination without creating a real external transfer.

The frontend never directly edits wallet balances in Supabase mode. Savings movements use the `move_savings_goal_money` RPC, and donations use the hardened `service_payment` RPC.

## Files Created Or Updated

- `js/services/savings-service.js`
- `js/services/donation-service.js`
- `js/services/wallet-service.js`
- `js/services/demo-data.js`
- `js/pages/app.js`
- `supabase/migrations/002_rpc_functions.sql`
- `supabase/migrations/003_rls_policies.sql`
- `tests/phase12-smoke.mjs`
- `docs/phase-12-savings-donation.md`
- `README.md`
- `docs/beginner-phase-guide.md`
- `docs/security.md`

## Savings Features

Users can:

- Create a savings goal.
- Set a target amount.
- Set a target date.
- View progress percentage.
- Deposit fake demo balance into the goal.
- Withdraw fake demo savings back to wallet balance.
- View goal history entries.
- Generate demo receipts for deposits and withdrawals.

## Donation Features

Users can donate fake demo money to fictional organizations:

- Future Learners Fund
- Green Steps Collective
- Open Care Mission

Each donation receipt clearly states that this is an educational demo and not a real donation.

## Windows 11 Commands

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

Run the Phase 12 smoke test:

```powershell
node tests\phase12-smoke.mjs
```

Expected output:

```text
Phase 12 smoke test passed: savings goals, progress, entries, withdrawals, donation receipts, idempotency, and history are correct.
```

## How To Test In The Browser

1. Open NexaPay.
2. Choose the Customer demo role.
3. Open **Savings**.
4. Create a goal such as `Emergency Demo Fund`.
5. Deposit a small demo amount.
6. Confirm that progress and goal history update.
7. Withdraw part of the demo savings.
8. Confirm that a receipt appears.
9. Open **Donation**.
10. Choose a fictional organization.
11. Enter a demo amount and optional message.
12. Type `DEMO` to confirm.
13. Open **Transactions** and filter by Savings or Donation.

## Supabase Setup

Open Supabase:

1. Go to your project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/002_rpc_functions.sql`.
4. Run `supabase/migrations/003_rls_policies.sql`.

The important Phase 12 RPCs are:

```text
create_savings_goal(p_title, p_target_amount, p_target_date)
move_savings_goal_money(p_goal_id, p_amount, p_direction, p_note, p_idempotency_key)
service_payment(...)
```

## Security Notes

- Savings deposits deduct wallet balance and increase goal balance atomically.
- Savings withdrawals decrease goal balance and credit wallet balance atomically.
- Donation transactions validate active fictional organizations.
- Duplicate savings and donation requests use idempotency keys.
- Users cannot directly update wallet balances from frontend JavaScript.
- Users cannot directly update savings progress in Supabase; they must use RPC.

## Common Errors And Solutions

`Deposit exceeds the remaining target amount.`

Use an amount less than or equal to the goal's remaining amount.

`Insufficient demo savings.`

Withdraw less than or equal to the current saved amount.

`Choose an active fictional donation organization.`

Run `supabase/seed.sql` and refresh the app.

`A savings request identifier is required.`

Make sure the updated `js/services/savings-service.js` file is loaded.

## Completion Checklist

- Savings goals can be created.
- Progress updates after deposits and withdrawals.
- Goal history entries are visible.
- Deposits and withdrawals create receipts.
- Donations use fictional organizations only.
- Donation receipts include the educational demo disclaimer.
- Supabase savings movement is handled by RPC.
- Transaction history includes Savings and Donation filters.
