# Phase 16 - Agent Dashboard

## What We Built

Phase 16 creates a complete agent experience:

- Agent role protection.
- Agent demo balance.
- Agent code and location display.
- Daily transaction count and volume.
- Cash-in simulation.
- Agent-initiated cash-out simulation.
- Registered customer search.
- Review screens with demo fees.
- Confirmation using the word `DEMO`.
- Transaction history with search, status, date, and type filters.
- Receipt links for agent transactions.
- Supabase RPC functions for secure agent cash-in and cash-out.
- Audit records for agent actions.

No real cash is handled or dispensed.

## Why This Is Needed

Agents are part of many mobile financial service workflows. In NexaPay, the agent dashboard teaches:

- How role-specific dashboards work.
- How assisted transactions differ from self-service customer transactions.
- Why customer search should use registered demo users only.
- Why wallet balance changes must run through backend logic.
- How audit logs capture sensitive assisted actions.

## Files Added Or Updated

Added:

- `js/services/agent-service.js`
- `tests/phase16-smoke.mjs`
- `docs/phase-16-agent-dashboard.md`

Updated:

- `js/pages/app.js`
- `js/services/transaction-service.js`
- `css/components.css`
- `css/dashboard.css`
- `css/responsive.css`
- `css/transaction.css`
- `supabase/migrations/002_rpc_functions.sql`
- `README.md`
- `docs/beginner-phase-guide.md`
- `docs/architecture.md`
- `docs/security.md`
- `supabase/README.md`

## Folder Structure After This Phase

```text
nexapay/
├── css/
│   ├── components.css
│   ├── dashboard.css
│   ├── responsive.css
│   └── transaction.css
├── docs/
│   └── phase-16-agent-dashboard.md
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       ├── agent-service.js
│       └── transaction-service.js
├── supabase/
│   └── migrations/
│       └── 002_rpc_functions.sql
└── tests/
    └── phase16-smoke.mjs
```

## Supabase Setup

Run this after Phase 5, Phase 6, and RLS setup are already installed.

1. Open Supabase.
2. Open your NexaPay project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Open `supabase/migrations/002_rpc_functions.sql` in VS Code.
6. Select all SQL in that file.
7. Paste it into Supabase SQL Editor.
8. Click **Run**.

This installs:

- `agent_cash_in_demo_money`
- `agent_cash_out_demo_money`
- execute permissions for authenticated users

Also confirm:

1. Open **Table Editor > profiles**.
2. Confirm the agent user has `role = agent`.
3. Open **Table Editor > agents**.
4. Confirm `user_id` matches the agent Auth user ID.
5. Open **Table Editor > wallets**.
6. Confirm the agent has an active wallet.
7. Confirm `supabase/migrations/003_rls_policies.sql` has already been run.

## How To Run Locally

From PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open:

```text
http://localhost:5173
```

Click **Login**, then choose the **Agent** demo role.

## How To Test Manually

1. Open the Agent demo account.
2. Confirm the dashboard shows:
   - Agent demo balance
   - Agent code
   - Location
   - Today's count
   - Today's volume
   - Cash-in and cash-out volume
3. Open **Cash In**.
4. Search for `Ava`.
5. Select Ava Rahman.
6. Enter an amount.
7. Type `DEMO`.
8. Submit.
9. Confirm a receipt appears.
10. Open **Cash Out**.
11. Search for `Sami`.
12. Enter an amount.
13. Confirm the fee and total customer deduction.
14. Type `DEMO`.
15. Submit.
16. Open **History**.
17. Filter by Cash In and Cash Out.
18. Open a receipt.

Expected output:

- Agent cash-in deducts agent demo balance and credits the customer.
- Agent cash-out deducts the customer demo balance plus fee and credits the agent.
- Transactions appear in agent history.
- Audit records are created.
- Receipts include the educational demo disclaimer.

## Automated Test

Run:

```powershell
node tests\phase16-smoke.mjs
```

Expected output:

```text
Phase 16 smoke test passed: agent protection, customer search, cash-in, cash-out, stats, history, and audit records are correct.
```

## Common Errors And Solutions

**Error: function agent_cash_in_demo_money does not exist**

Run `supabase/migrations/002_rpc_functions.sql` again in Supabase SQL Editor.

**Agent page says no active agent record found**

The signed-in user has an agent role but no matching active row in `agents`. Create an agent row where `user_id` equals the Auth user ID.

**Customer search returns no customers**

Confirm demo customers exist in `profiles`, have `role = customer`, and `account_status = active`.

**Cash-out says customer has insufficient balance**

Use a smaller demo amount. Cash-out deducts amount plus a 1% demo fee.

## Completion Checklist

- [x] Agent pages are role protected.
- [x] Agent dashboard shows balance and daily statistics.
- [x] Agent can search registered demo customers.
- [x] Cash-in simulation creates a transaction and audit record.
- [x] Cash-out simulation creates a transaction and audit record.
- [x] Agent history supports search and filters.
- [x] No real cash, OTP, PIN, or financial credential is collected.
- [x] Smoke test added.
