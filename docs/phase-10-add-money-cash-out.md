# Phase 10 - Add Money And Cash Out Simulation

## What We Are Building

Phase 10 adds two complete customer workflows:

- Add Demo Money from fictional banks, a fictional card, or the demo balance faucet
- predefined amounts of 500, 1,000, 2,000, or 5,000 demo taka
- a daily Add Demo Money limit of 20,000 demo taka
- registered demo-agent search and selection
- Cash Out amount, 1% demo fee, total, and balance review
- secure balance updates through Supabase RPC functions
- duplicate-submission protection
- notifications, audit logs, transaction history, and downloadable demo receipts

Every screen clearly states that no real bank, card, cash, or financial transaction is involved.

## Why It Is Needed

Add Money demonstrates how a controlled wallet funding source can credit a demo wallet. Cash Out demonstrates a two-wallet transfer where the customer pays the amount plus a fee and a registered demo agent receives the simulated amount.

The browser never updates `wallets.balance` directly. Supabase performs each balance change and transaction record in one database transaction.

## Final Folder Structure For This Phase

```text
nexapay/
|-- pages/
|   `-- customer/
|       |-- add-money.html
|       `-- cash-out.html
|-- js/
|   |-- pages/
|   |   `-- app.js
|   `-- services/
|       |-- funding-service.js
|       `-- wallet-service.js
|-- css/
|   `-- transaction.css
|-- supabase/
|   `-- migrations/
|       `-- 002_rpc_functions.sql
|-- tests/
|   `-- phase10-smoke.mjs
`-- docs/
    `-- phase-10-add-money-cash-out.md
```

## Files Created Or Updated

- `js/services/funding-service.js`
- `js/services/wallet-service.js`
- `js/pages/app.js`
- `css/transaction.css`
- `supabase/migrations/002_rpc_functions.sql`
- `tests/phase10-smoke.mjs`
- `docs/phase-10-add-money-cash-out.md`
- `docs/security.md`
- `docs/beginner-phase-guide.md`
- `supabase/README.md`
- `README.md`

## Step 1 - Run The Updated Supabase Functions

1. Open your Supabase project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/002_rpc_functions.sql` in VS Code.
5. Select the entire file and copy it.
6. Paste it into the Supabase SQL Editor.
7. Click **Run**.

Expected result: Supabase reports success and these functions are available:

- `add_demo_money`
- `search_demo_agents`
- `cash_out_demo_money`
- `transfer_demo_money`

This migration is safe to rerun because it uses `create or replace function`.

## Step 2 - Confirm A Registered Demo Agent Exists

1. In Supabase, open **Authentication > Users**.
2. Confirm a fictional agent Auth user exists.
3. Open **Table Editor > profiles**.
4. Confirm the same user's `role` is `agent` and `account_status` is `active`.
5. Open **Table Editor > agents**.
6. Confirm an agent row points to that profile and has `status` set to `active`.
7. Open **Table Editor > wallets**.
8. Confirm the agent has an active demo wallet.

For the supplied fictional account, create Auth users first and then run `supabase/demo-seed-after-auth.sql`. That file adds `Mira Chowdhury`, agent code `NPA-2001`, at `Banani Demo Point`. It does not publish a password.

## Step 3 - Run NexaPay On Windows 11

Open PowerShell and run:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open `http://127.0.0.1:5173/login.html` in your browser. Keep the PowerShell window open while testing.

## Step 4 - Test Add Demo Money

1. Log in as a customer.
2. Open **Add Money**.
3. Choose `Nova Bank Demo`.
4. Choose the predefined amount `1,000`.
5. Confirm the review shows zero fee and the expected balance after funding.
6. Type `DEMO` in the confirmation field.
7. Click **Add demo balance**.

Expected result:

- the customer's demo balance increases by 1,000
- a completed `add_money` transaction is created
- the receipt names the fictional source
- the transaction appears in customer history
- the receipt displays the educational disclaimer

No card number, CVV, bank password, or financial credential is requested.

## Step 5 - Test Cash Out

1. Log in as a customer.
2. Open **Cash Out**.
3. Search for `Mira`, `NPA-2001`, or `Banani`.
4. Choose the registered demo agent.
5. Enter `250`.
6. Confirm the review shows a 1% fee of `2.50` and total deduction of `252.50`.
7. Type `DEMO`.
8. Click **Confirm simulated cash out**.

Expected result:

- the customer loses 252.50 demo taka
- the registered agent receives 250 demo taka
- a completed `cash_out` transaction is created
- customer and agent histories both contain the record
- the receipt displays the agent code and demo location
- the screen says no real cash is dispensed

## Step 6 - Run The Automated Local Smoke Test

From the `nexapay` folder, run:

```powershell
node tests\phase10-smoke.mjs
```

Expected output:

```text
Phase 10 smoke test passed: Add Money, idempotency, Cash Out, fees, balances, and history are correct.
```

## Security Design

Phase 10 enforces:

- authenticated user checks
- active customer profile and wallet checks
- predefined Add Money amounts only
- fictional funding-source allowlist
- 20,000 demo taka daily Add Money limit
- active agent profile, agent registration, and agent wallet checks
- positive Cash Out amount with a maximum demo limit
- 1% fee calculated by trusted backend logic
- wallet row locking during transfers
- insufficient balance rejection
- unique idempotency key for each confirmation
- atomic wallet updates and transaction creation
- notifications and audit logs
- no direct wallet update from frontend JavaScript

## Common Errors And Solutions

### Function does not exist

Run the complete latest `supabase/migrations/002_rpc_functions.sql` in **SQL Editor**.

### No active registered demo agent was found

Check `profiles`, `agents`, and `wallets`. The profile role and both account statuses must be active, and the agent row must point to the same profile ID.

### Choose one of the predefined demo amounts

Use 500, 1,000, 2,000, or 5,000. Custom Add Money values are intentionally blocked.

### Daily add demo money limit exceeded

The customer has reached 20,000 demo taka in completed Add Money transactions for the current database day. Wait until the next day or reset only your controlled demo data.

### Insufficient demo balance

Cash Out deducts the entered amount plus the 1% demo fee. Enter a smaller amount.

### Type DEMO to confirm

Enter the fictional confirmation word `DEMO`. NexaPay never asks for a real financial PIN.

## Completion Checklist

- Fictional demo banks, demo card, and faucet appear.
- Only predefined Add Money amounts are accepted.
- Add Money daily limit is enforced.
- Registered demo agents can be searched and selected.
- Cash Out fee and total update as the amount changes.
- Add Money uses `add_demo_money` in Supabase mode.
- Cash Out uses `cash_out_demo_money` in Supabase mode.
- Duplicate submission does not change balance twice.
- Transaction history and receipts are created.
- Customer and agent balances update securely.
- No frontend code directly updates Supabase wallet balances.
- Every flow clearly states that it is a simulation.
