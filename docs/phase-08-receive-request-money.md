# Phase 8 - Receive Money And Request Money

## What We Are Building

Phase 8 adds incoming-money workflows:

- personal demo QR code
- internal NexaPay payment link
- account identifier
- searchable registered demo users
- request money creation
- pending request list
- accept request
- decline request
- cancel request
- secure transfer when a request is accepted
- notifications and audit logs

Everything remains educational demo money only.

## Why It Is Needed

Digital wallets are not only outgoing transfers. Users also need a safe way to receive money and ask another registered user to pay. The important security rule stays the same: accepted requests must move demo balance through secure PostgreSQL functions, not direct frontend wallet updates.

## Final Folder Structure For This Phase

```text
nexapay/
├── pages/
│   └── customer/
│       └── request-money.html
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       ├── request-money-service.js
│       ├── send-money-service.js
│       └── wallet-service.js
├── supabase/
│   └── migrations/
│       └── 002_rpc_functions.sql
└── docs/
    └── phase-08-receive-request-money.md
```

## Files Created Or Updated

- `js/services/request-money-service.js`
- `js/services/wallet-service.js`
- `js/pages/app.js`
- `js/components/icons.js`
- `supabase/migrations/002_rpc_functions.sql`
- `docs/phase-08-receive-request-money.md`
- `docs/database-schema.md`
- `README.md`
- `docs/beginner-phase-guide.md`

## Step 1 - Run The Updated RPC SQL

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

Expected result: Supabase creates or replaces these functions:

- `create_demo_money_request`
- `list_demo_money_requests`
- `respond_money_request`
- `cancel_demo_money_request`
- `transfer_demo_money`

The SQL also adds `money_requests.idempotency_key` if it does not already exist.

## Step 2 - Confirm RLS Is Enabled

If you have not run RLS yet:

1. Click **SQL Editor**.
2. Click **New query**.
3. Open:

```text
supabase/migrations/003_rls_policies.sql
```

4. Copy the full file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.

Expected result: users can see requests involving them, but cannot freely edit another user's requests or wallet.

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

## Step 4 - Test Receive Money

1. Login as a customer.
2. Open **Request Money**.
3. Confirm the **Receive Money** card appears.
4. Confirm the personal QR value starts with:

```text
NEXAPAY:USER:
```

5. Confirm the internal link opens the Send Money page with your demo phone number in the URL.

Expected result: the link routes inside NexaPay only. It is not a real payment link.

## Step 5 - Test Request Creation

1. Login as Customer A.
2. Open **Request Money**.
3. Search for Customer B by fictional phone number or name.
4. Choose Customer B.
5. Enter amount:

```text
150
```

6. Add note:

```text
Shared lunch
```

7. Click **Submit request**.

Expected result:

- request appears as pending
- receiver gets a notification
- audit log is created
- `money_requests` row is created

## Step 6 - Test Accept

1. Logout from Customer A.
2. Login as Customer B.
3. Open **Request Money**.
4. Find the pending request.
5. Click **Accept**.

Expected result:

- request status becomes `accepted`
- Customer B balance decreases by amount plus request-money fee
- Customer A balance increases by amount
- transaction row is created with type `request_money`
- notifications are created
- audit log is created

## Step 7 - Test Decline

1. Create another request from Customer A to Customer B.
2. Login as Customer B.
3. Click **Decline**.

Expected result:

- request status becomes `declined`
- no wallet balance changes happen
- requester gets a notification
- audit log is created

## Step 8 - Test Cancel

1. Login as Customer A.
2. Create a request to Customer B.
3. Before Customer B responds, click **Cancel** on the pending outgoing request.

Expected result:

- request status becomes `cancelled`
- no wallet balance changes happen
- receiver gets a notification
- audit log is created

## Security Design

The backend functions enforce:

- authenticated users only
- registered demo users only
- customer-to-customer requests only
- no requesting from yourself
- positive amount
- maximum demo amount
- note length limit
- idempotency key for request creation
- only receiver can accept or decline
- only requester can cancel
- only pending requests can change state
- accepted requests call `transfer_demo_money`
- wallet changes are atomic and rollback on failure

## Common Errors And Fixes

**Error: function create_demo_money_request does not exist**

Fix: Run the latest `supabase/migrations/002_rpc_functions.sql`.

**Error: Enter at least 3 characters**

Fix: Supabase search requires at least 3 characters of a fictional name or phone number.

**Error: Only the receiver can respond**

Fix: Logout and login as the user who received the request.

**Error: Only the requester can cancel**

Fix: Logout and login as the user who created the request.

**Error: Insufficient demo balance**

Fix: The payer does not have enough fake demo balance to accept the request.

## Completion Checklist

- Personal demo QR appears.
- Internal NexaPay payment link appears.
- Request creation works.
- Pending incoming requests show Accept and Decline.
- Pending outgoing requests show Cancel.
- Accepted request creates a secure simulated transfer.
- Declined request does not move balance.
- Cancelled request does not move balance.
- Notifications are created.
- Audit logs are created.
- Frontend does not directly edit Supabase wallet balances.
