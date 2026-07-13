# Phase 7 - Secure Send Money System

## What We Are Building

Phase 7 creates the real Send Money architecture for NexaPay:

- multi-step customer transfer screen
- recipient search by registered demo user
- amount validation
- demo fee calculation
- review screen
- safe confirmation word
- idempotency key for duplicate prevention
- secure Supabase RPC transaction function
- atomic wallet debit and credit
- transaction record
- sender and receiver notifications
- audit log record
- printable/downloadable demo receipt

## Why It Is Needed

Wallet balances must never be changed directly from frontend JavaScript. In Supabase mode, the browser sends a request to a PostgreSQL function named `transfer_demo_money`. That function validates everything, locks the wallets, updates balances, writes the transaction, and creates notifications in one database transaction.

If any step fails, PostgreSQL rolls back the whole operation.

## Final Folder Structure For This Phase

```text
nexapay/
├── pages/
│   └── customer/
│       └── send-money.html
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       ├── send-money-service.js
│       └── wallet-service.js
├── supabase/
│   └── migrations/
│       └── 002_rpc_functions.sql
└── docs/
    └── phase-07-secure-send-money.md
```

## Files Created Or Updated

- `js/services/send-money-service.js`
- `js/pages/app.js`
- `supabase/migrations/002_rpc_functions.sql`
- `docs/phase-07-secure-send-money.md`
- `README.md`
- `docs/beginner-phase-guide.md`
- `supabase/README.md`

## Step 1 - Run The Secure RPC SQL

Open Supabase.

1. Click **SQL Editor**.
2. Click **New query**.
3. Open this file in VS Code:

```text
supabase/migrations/002_rpc_functions.sql
```

4. Copy the full file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

Expected result: Supabase shows a success message and the function `transfer_demo_money` is created or replaced.

## Step 2 - Enable RLS Policies

If you have not run the RLS file yet:

1. Click **SQL Editor**.
2. Click **New query**.
3. Open:

```text
supabase/migrations/003_rls_policies.sql
```

4. Copy the full file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

Expected result: users can read their own wallet and related transactions, but cannot directly update wallet balances.

## Step 3 - Confirm Frontend Supabase Keys

Open:

```text
js/config/supabase.js
```

Confirm these values are filled in with your Supabase project values:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```

Only use the anon public key. Never paste the service-role key into frontend code.

## Step 4 - Create Two Demo Customers

In the NexaPay app:

1. Open `signup.html`.
2. Create Customer A with fictional data.
3. Logout.
4. Create Customer B with fictional data.
5. Keep Customer B's demo phone number for testing.

Every signup should automatically create:

- Auth user
- profile row
- wallet row
- welcome notification

## Step 5 - Run The App On Windows 11

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open:

```text
http://127.0.0.1:5173/login.html
```

## Step 6 - Test A Successful Send Money Flow

1. Login as Customer A.
2. Open **Send Money**.
3. Search for Customer B by fictional phone number.
4. Choose Customer B.
5. Enter amount:

```text
100
```

6. Choose reference:

```text
Gift
```

7. Review the amount, fee, total deduction, receiver, and request ID.
8. Type:

```text
DEMO
```

9. Click **Confirm**.

Expected result:

- success screen appears
- transaction ID is shown
- sender wallet decreases by amount plus fee
- receiver wallet increases by amount
- transaction row is created
- sender notification is created
- receiver notification is created
- audit log is created
- receipt includes the educational demo disclaimer

## Step 7 - Confirm In Supabase Tables

In Supabase:

1. Click **Table Editor**.
2. Open `wallets`.
3. Confirm Customer A balance decreased.
4. Confirm Customer B balance increased.
5. Open `transactions`.
6. Confirm a `send_money` transaction exists.
7. Open `notifications`.
8. Confirm both sender and receiver notifications exist.
9. Open `audit_logs`.
10. Confirm `transfer_demo_money` exists.

## Step 8 - Test Validation

Try these cases from the Send Money page:

```text
Amount: 0
Amount: -10
Amount: 1000000
Receiver: yourself
Confirmation word: anything except DEMO
```

Expected result: the app or database rejects the transfer.

## Step 9 - Test Duplicate Prevention

The page creates one request ID for the current wizard. If the Confirm button is clicked twice during a slow network request, the database returns the existing transaction instead of deducting twice.

For a direct SQL/RPC test, call `transfer_demo_money` twice with the same `p_idempotency_key` while logged in as the same user. Expected result: only one transaction row is created.

## Security Design

The secure backend function does all of this:

- requires an authenticated user
- requires an idempotency key
- rejects zero and negative amounts
- rejects amounts below the demo minimum
- rejects amounts over the demo maximum
- rejects more than two decimal places
- rejects sending to yourself
- verifies sender profile exists
- verifies receiver profile exists
- verifies both accounts are active
- verifies Send Money receivers are customers
- verifies both wallets exist
- locks both wallets in a deterministic order
- checks available balance
- calculates the demo fee
- debits the sender
- credits the receiver
- writes one transaction row
- writes sender and receiver notifications
- writes an audit log
- rolls back everything if any step fails

## Common Errors And Fixes

**Error: Could not find the function transfer_demo_money**

Fix: Run `supabase/migrations/002_rpc_functions.sql` in SQL Editor.

**Error: Enter at least 3 characters**

Fix: Supabase recipient search requires at least 3 characters of a fictional name or phone number.

**Error: Receiver profile was not found**

Fix: Make sure the receiver signed up through NexaPay and has a `profiles` row.

**Error: Insufficient demo balance**

Fix: Use a smaller amount or use the Phase 10 Add Demo Money feature later.

**Error: Direct wallet update blocked**

Fix: That is expected. Normal users should not be able to update `wallets.balance` from the frontend or Table Editor.

## Completion Checklist

- Send Money page has six steps.
- Recipient search works in local demo mode.
- Recipient search uses Supabase RPC in Supabase mode.
- Amount, fee, total, receiver, and request ID appear on the review step.
- Confirmation uses the fictional word `DEMO`.
- Frontend does not update Supabase wallet balances directly.
- `transfer_demo_money` updates balances atomically.
- Duplicate request IDs do not double charge.
- Sender and receiver notifications are created.
- Transaction history shows the completed transfer.
- Receipt prints/downloads with the educational demo disclaimer.
