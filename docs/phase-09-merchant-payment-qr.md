# Phase 9 - Merchant Payment And QR Simulation

## What We Are Building

Phase 9 adds merchant payment workflows:

- merchant search
- merchant selection
- payment amount and reference
- payment review and confirmation
- simulated QR generation for merchants
- simulated QR reading for customers
- QR payment confirmation
- merchant balance update through secure RPC
- transaction records
- demo receipts

No real merchant, checkout, gateway, bank, QR network, or card system is connected.

## Why It Is Needed

Merchant payment is a core digital-wallet workflow. NexaPay models it safely by storing fictional merchants in Postgres and moving demo money through the same secure transfer RPC used by wallet transfers.

The browser never directly updates Supabase wallet balances.

## Final Folder Structure For This Phase

```text
nexapay/
├── pages/
│   ├── customer/
│   │   ├── payment.html
│   │   └── scan.html
│   └── merchant/
│       └── merchant-qr.html
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       └── merchant-payment-service.js
├── supabase/
│   └── migrations/
│       └── 002_rpc_functions.sql
└── docs/
    └── phase-09-merchant-payment-qr.md
```

## Files Created Or Updated

- `js/services/merchant-payment-service.js`
- `js/pages/app.js`
- `supabase/migrations/002_rpc_functions.sql`
- `docs/phase-09-merchant-payment-qr.md`
- `README.md`
- `docs/beginner-phase-guide.md`

## Step 1 - Run The Updated RPC SQL

Open Supabase.

1. Click **SQL Editor**.
2. Click **New query**.
3. Open:

```text
supabase/migrations/002_rpc_functions.sql
```

4. Copy the full file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

Expected result: these RPCs exist:

- `search_demo_merchants`
- `get_demo_merchant_by_qr`
- `transfer_demo_money`

## Step 2 - Confirm Demo Merchants Exist

In Supabase:

1. Click **Table Editor**.
2. Open `merchants`.
3. Confirm fictional merchants exist.
4. Confirm each merchant has:

```text
merchant_code
qr_identifier
owner_id
status = active
```

If no merchants exist, create fictional merchant Auth users and run the demo seed instructions from `supabase/demo-seed-after-auth.sql`.

## Step 3 - Run The Project On Windows 11

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open:

```text
http://127.0.0.1:5173/login.html
```

## Step 4 - Test Merchant Search Payment

1. Login as a customer.
2. Open **Payment**.
3. Search:

```text
Orion
```

4. Choose the merchant.
5. Enter amount:

```text
250
```

6. Add reference:

```text
Demo order
```

7. Type confirmation word:

```text
DEMO
```

8. Click **Confirm payment**.

Expected result:

- payment succeeds
- customer balance decreases
- merchant balance increases
- transaction type is `merchant_payment`
- receipt appears with educational demo disclaimer

## Step 5 - Test Merchant QR Generation

1. Login as a merchant demo user.
2. Open **Merchant QR**.
3. Confirm the QR payload looks like:

```text
NEXAPAY:MERCHANT:NPM-1001
```

4. Confirm the QR screen says no passwords, tokens, or secrets are encoded.

Expected result: merchant sees a simulated QR and safe internal payload.

## Step 6 - Test QR Reading Simulation

1. Login as a customer.
2. Open **Scan**.
3. Paste a merchant QR payload such as:

```text
NEXAPAY:MERCHANT:NPM-1001
```

4. Click **Read QR**.
5. Confirm merchant details load.
6. Enter amount.
7. Type `DEMO`.
8. Confirm QR payment.

Expected result:

- QR data resolves to the fictional merchant
- payment succeeds through `transfer_demo_money`
- receipt appears
- no sensitive data is stored in the QR payload

## Security Design

The Phase 9 flow enforces:

- active fictional merchants only
- safe QR payloads containing only merchant identifiers
- authenticated customer session
- positive payment amount
- maximum demo amount
- merchant receiver role check in `transfer_demo_money`
- atomic wallet updates
- transaction record
- notifications
- audit log
- demo receipt disclaimer

## Common Errors And Fixes

**Error: function search_demo_merchants does not exist**

Fix: Run the latest `supabase/migrations/002_rpc_functions.sql`.

**Error: Merchant not found**

Fix: Use an active fictional merchant code or QR payload from the `merchants` table.

**Error: Type DEMO to confirm**

Fix: The confirmation word is intentionally fictional. Enter `DEMO`.

**Error: Insufficient demo balance**

Fix: Use a smaller amount or add demo money later.

## Completion Checklist

- Merchant search works.
- Customer can confirm merchant payment.
- Merchant receives demo balance through RPC.
- Transaction record is created.
- Demo receipt appears.
- Merchant QR payload is generated.
- Customer QR reading simulation loads merchant details.
- QR payload contains no secrets.
- Frontend does not directly update Supabase wallet balances.
