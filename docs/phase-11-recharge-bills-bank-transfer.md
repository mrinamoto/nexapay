# Phase 11 - Mobile Recharge, Bill Payment, And Bank Transfer Simulation

## What We Built

Phase 11 adds three complete customer simulations:

- Mobile Recharge Simulation
- Bill Payment Simulation
- Demo Bank Transfer

Each flow is multi-step:

1. Enter or choose fictional service details.
2. Enter a demo amount.
3. Review amount, fee, total, and request ID.
4. Type `DEMO` to confirm.
5. Generate a demo receipt.

No real telecom, bill provider, bank, OTP, card, or payment network is connected.

## Why This Is Needed

Digital wallet apps commonly support service payments. This phase teaches how to model those flows safely:

- The frontend collects only fictional demo details.
- Validation happens before submission.
- Supabase mode calls the `service_payment` RPC.
- Wallet balances are never edited directly from frontend JavaScript.
- Transactions include metadata for receipts and history.
- Idempotency keys prevent accidental duplicate submissions.

## Files Created Or Updated

- `js/services/service-payment-service.js`
- `js/services/wallet-service.js`
- `js/pages/app.js`
- `js/services/demo-data.js`
- `supabase/migrations/002_rpc_functions.sql`
- `supabase/seed.sql`
- `tests/phase11-smoke.mjs`
- `docs/phase-11-recharge-bills-bank-transfer.md`
- `README.md`
- `docs/beginner-phase-guide.md`
- `docs/security.md`

## Fictional Demo Data

Recharge operators:

- DemoTel
- Nova Mobile
- ConnectX
- Wave Telecom

Bill providers:

- LumenGrid Demo Power
- HearthGas Demo Network
- BlueWater Demo Utility
- FiberLane Demo Internet
- StudyBridge Demo School
- PrismCast Demo TV
- CivicPay Demo Services

Banks:

- Nova Bank
- Horizon Bank
- Unity Bank

## Windows 11 Commands

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open this URL in your browser:

```text
http://localhost:5173
```

To run the local smoke test:

```powershell
node tests\phase11-smoke.mjs
```

Expected output:

```text
Phase 11 smoke test passed: recharge, bill payment, bank transfer, idempotency, metadata, fees, and history are correct.
```

## How To Test In The Browser

1. Open `http://localhost:5173`.
2. Choose the Customer demo role.
3. Open **Recharge**.
4. Enter a demo phone number such as `01710000000`.
5. Choose a fictional operator.
6. Choose an amount and type `DEMO`.
7. Confirm that a receipt appears.
8. Repeat for **Bills** and **Bank Transfer**.
9. Open **Transactions**.
10. Confirm that recharge, bill payment, and bank transfer records appear.

## Supabase Setup

Open Supabase:

1. Go to your project.
2. Open **SQL Editor**.
3. Run `supabase/seed.sql` to add the newest fictional providers.
4. Run `supabase/migrations/002_rpc_functions.sql` to update the secure `service_payment` RPC.
5. If RLS has not been installed yet, run `supabase/migrations/003_rls_policies.sql`.

The frontend calls:

```text
service_payment(p_amount, p_transaction_type, p_reference, p_metadata, p_idempotency_key)
```

The function validates:

- Authenticated user
- Active profile
- Active wallet
- Positive amount
- Service-specific limits
- Fictional operator, bill provider, or bank
- Idempotency key
- Available demo balance

## Common Errors And Solutions

`Choose an active fictional recharge operator.`

Run `supabase/seed.sql`, refresh the page, and choose one of the seeded operators.

`Choose a provider from the selected fictional bill category.`

Pick a provider after choosing the category. The provider list changes by category.

`Insufficient demo balance.`

Use a smaller demo amount or use **Add Money** from Phase 10.

`A service request identifier is required.`

Make sure the page is using the updated `js/services/service-payment-service.js` file.

## Completion Checklist

- Recharge has a multi-step flow.
- Bill payment has a category-filtered provider flow.
- Bank transfer shows the 1% demo fee.
- All flows require `DEMO` confirmation.
- All receipts display the educational demo disclaimer.
- Transaction history includes all three transaction types.
- Supabase mode uses RPC only for balance-changing service payments.
- No real financial credentials are requested.
