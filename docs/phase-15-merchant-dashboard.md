# Phase 15 - Merchant Dashboard

## What We Built

Phase 15 turns the merchant area into a complete role-specific interface:

- Merchant authentication protection through the existing role guard.
- Merchant demo balance.
- Payment statistics and seven-day demo volume chart.
- Recent merchant payments.
- Searchable payment history.
- Status and date filters.
- Receipt links for each merchant payment.
- Safe QR payload generation.
- Internal demo payment link generation.
- Merchant business profile management.

All merchant payments remain simulated. NexaPay does not connect to real payment gateways, bank settlement, merchant acquiring, or real checkout systems.

## Why This Is Needed

A digital wallet simulator needs both customer and merchant perspectives. The merchant dashboard teaches:

- Role-based page protection.
- Business-owned wallet views.
- Incoming payment history.
- Search and filtering for operational workflows.
- Safe QR payload design.
- Profile management without collecting real business credentials.

## Files Added Or Updated

Added:

- `js/services/merchant-service.js`
- `tests/phase15-smoke.mjs`
- `docs/phase-15-merchant-dashboard.md`

Updated:

- `js/pages/app.js`
- `css/dashboard.css`
- `css/responsive.css`
- `css/transaction.css`
- `README.md`
- `docs/beginner-phase-guide.md`
- `docs/architecture.md`
- `docs/security.md`

## Folder Structure After This Phase

```text
nexapay/
├── css/
│   ├── dashboard.css
│   ├── responsive.css
│   └── transaction.css
├── docs/
│   └── phase-15-merchant-dashboard.md
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       └── merchant-service.js
└── tests/
    └── phase15-smoke.mjs
```

## Supabase Setup

No new table is required for this phase.

Before testing in Supabase mode, confirm these are already installed:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rpc_functions.sql`
3. `supabase/migrations/003_rls_policies.sql`
4. `supabase/migrations/004_auth_integration.sql`

Supabase checks:

1. Open **Table Editor**.
2. Open `profiles`.
3. Confirm your merchant user has `role = merchant`.
4. Open `merchants`.
5. Confirm `owner_id` matches the merchant Auth user ID.
6. Open `wallets`.
7. Confirm the merchant user has a wallet row.
8. Open **SQL Editor** and confirm RLS policies were run.

The merchant profile form updates:

- The signed-in owner's safe profile fields in `profiles`.
- The linked merchant business name and category in `merchants`.

It does not collect bank accounts, settlement credentials, tax IDs, or real business verification data.

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

Click **Login**, then choose the **Merchant** demo role.

## How To Test Manually

1. Open the Merchant demo account.
2. Confirm the Merchant dashboard shows:
   - Demo balance
   - Today's payments
   - Total payment volume
   - Average payment
   - Recent payments
3. Open **Payments**.
4. Search for `Ava`.
5. Click a payment receipt.
6. Print or download the demo receipt.
7. Open **QR**.
8. Copy the safe QR payload.
9. Copy the internal demo payment link.
10. Open **Profile**.
11. Change the business name and category.
12. Save the profile.

Expected output:

- Only merchant-role users can open merchant pages.
- Payment rows show incoming merchant payments.
- Search and filters update the payment list.
- Receipts include the educational demo disclaimer.
- QR payload contains only `NEXAPAY:MERCHANT:NPM-...`.
- Merchant profile changes save in the demo state.

## Automated Test

Run:

```powershell
node tests\phase15-smoke.mjs
```

Expected output:

```text
Phase 15 smoke test passed: merchant protection, dashboard, stats, QR, search, receipts data, and profile management are correct.
```

## Common Errors And Solutions

**Merchant page says no merchant record found**

Your signed-in user has the merchant role but no row in `merchants`. Create a merchant row where `owner_id` equals the Auth user ID.

**Profile update fails in Supabase**

Confirm `003_rls_policies.sql` has been run. Merchant owners need the policy that lets them update their own merchant profile.

**No payments appear**

Create a customer merchant payment first from the customer Payment or Scan page. Merchant history only shows `merchant_payment` transactions received by the merchant.

**QR link opens Scan but merchant is not found**

Confirm `002_rpc_functions.sql` has been run so the QR lookup RPC exists, and confirm the merchant row is active.

## Completion Checklist

- [x] Merchant pages are role protected.
- [x] Merchant dashboard shows demo balance and payment statistics.
- [x] Merchant payments can be searched and filtered.
- [x] Merchant payment receipts are reachable.
- [x] QR screen generates only safe internal identifiers.
- [x] Merchant profile management updates safe fields only.
- [x] No real merchant banking or payment credentials are collected.
- [x] Smoke test added.
