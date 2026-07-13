# Phase 18 - Security Review And Supabase Row Level Security

## What We Built

Phase 18 hardens NexaPay's Supabase security model.

This phase adds a complete rerunnable RLS policy file, narrows direct table writes, protects role/admin actions, blocks direct wallet and transaction mutation, adds Supabase Storage policies for future profile images and merchant logos, validates demo asset URLs, and removes local password hashes from admin-loaded demo data.

## Why It Is Needed

Frontend route protection is helpful for user experience, but it is not security. A user can open browser developer tools and call Supabase directly with the public anon key. The database must enforce ownership, roles, and transaction safety.

Phase 18 makes the database the real security boundary.

## Files Added

```text
docs/phase-18-security-review-rls.md
js/utils/security.js
tests/phase18-security-smoke.mjs
```

## Files Updated

```text
supabase/migrations/002_rpc_functions.sql
supabase/migrations/003_rls_policies.sql
js/services/admin-service.js
js/services/contact-service.js
js/services/merchant-service.js
js/services/wallet-service.js
README.md
docs/beginner-phase-guide.md
docs/security.md
docs/database-schema.md
supabase/README.md
```

## Main Security Controls

- All application tables have RLS enabled.
- Unauthenticated direct table access is revoked.
- Users can read only their own profile, wallet, notifications, favorites, savings, and related transactions.
- Admins can read operational data through database role checks.
- Wallet balances cannot be directly inserted or updated from frontend JavaScript.
- Transaction rows cannot be directly inserted, updated, or deleted from frontend JavaScript.
- Money requests are created/responded to through RPC logic, not direct table mutation.
- Admin account status changes use `admin_set_profile_status`.
- Admin content saves use audited RPC functions:
  - `admin_save_managed_item`
  - `admin_save_promotion`
- Admin announcements use `admin_create_announcement`.
- Admin settings use `admin_update_system_setting`.
- Role assignment stays behind `assign_demo_role`.
- Merchant owners cannot rewrite merchant code, QR identifier, owner, status, or created date.
- Users can only update notification read state, not notification title/message/type.
- Storage buckets are private and folder-scoped:
  - `profile-images`
  - `merchant-logos`
- Profile image URL fields reject `http:`, `javascript:`, and `data:` URLs.
- Local demo password hashes are not returned by the admin data service.

## Supabase Setup

Run the migrations in this order:

1. Open Supabase Dashboard.
2. Open the NexaPay project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Paste all SQL from `supabase/migrations/001_schema.sql`.
6. Click **Run**.
7. Click **New query**.
8. Paste all SQL from `supabase/seed.sql`.
9. Click **Run**.
10. Click **New query**.
11. Paste all SQL from `supabase/migrations/004_auth_integration.sql`.
12. Click **Run**.
13. Click **New query**.
14. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
15. Click **Run**.
16. Click **New query**.
17. Paste all SQL from `supabase/migrations/003_rls_policies.sql`.
18. Click **Run**.

Important:

- `003_rls_policies.sql` is safe to rerun.
- Run `002_rpc_functions.sql` before `003_rls_policies.sql`.
- Never paste a Supabase service-role key into `js/config/supabase.js`.

## Storage Setup

The RLS file creates and secures these buckets:

```text
profile-images
merchant-logos
```

Expected upload paths later:

```text
profile-images/<auth-user-id>/avatar.webp
merchant-logos/<merchant-id>/logo.webp
```

The current app can still use blank avatar values or safe HTTPS/project asset URLs. No upload UI is required for Phase 18.

## Manual Security Tests

### Test 1 - Normal User Cannot Edit Wallet Balance

1. Sign in as a normal customer.
2. Open Supabase **Table Editor > wallets**.
3. Try to edit the customer's `balance` from the browser-authenticated client.

Expected result:

```text
The update is blocked by RLS.
```

### Test 2 - Normal User Cannot Create Transaction Rows Directly

Try to insert a row into `transactions` from the frontend client.

Expected result:

```text
The insert is blocked. Transactions must be created by RPC functions.
```

### Test 3 - User Can Only Manage Own Notifications

1. Sign in as Customer A.
2. Mark Customer A's notification as read.
3. Try to edit another user's notification.

Expected result:

```text
Own read state works. Other user's notification is blocked.
```

### Test 4 - Merchant Cannot Rewrite QR Identity

1. Sign in as a merchant.
2. Update business name and category.
3. Try to update `merchant_code`, `qr_identifier`, `owner_id`, or `status`.

Expected result:

```text
Safe business fields update. Sensitive merchant identity fields are blocked.
```

### Test 5 - Admin Actions Are Audited

1. Sign in as an active admin.
2. Suspend a demo user.
3. Create a promotion.
4. Open **Admin > Audit Logs**.

Expected result:

```text
Audit rows exist for the admin actions.
```

## Automated Test

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
node tests\phase18-security-smoke.mjs
```

Expected output:

```text
Phase 18 security smoke test passed: RLS, audited admin RPCs, storage policies, asset URL validation, and sensitive local data scrubbing are correct.
```

## Common Errors And Fixes

Problem: `function admin_save_managed_item does not exist`

Fix: Run the latest `supabase/migrations/002_rpc_functions.sql`.

Problem: `policy already exists`

Fix: Make sure you are using the Phase 18 version of `003_rls_policies.sql`. It starts by dropping old policies and is safe to rerun.

Problem: Storage policy fails because `storage` does not exist.

Fix: Run this in a normal Supabase project. Supabase projects include the Storage schema. Local PostgreSQL without Supabase Storage will not have it.

Problem: Favorites fail when saving the same contact twice.

Fix: Use the Phase 18 `contact-service.js`, which inserts duplicates with `ignoreDuplicates: true`.

Problem: Avatar URL is rejected.

Fix: Use a blank value, a project asset path such as `assets/images/avatar.png`, or an HTTPS URL.

## Completion Checklist

- RLS is enabled on all app tables.
- `003_rls_policies.sql` is rerunnable.
- Anonymous table access is revoked.
- Direct wallet balance editing is blocked.
- Direct transaction editing is blocked.
- Admin content saves use audited RPCs.
- Role assignment stays behind admin RPC logic.
- Merchant sensitive fields are protected.
- Notification content fields are protected.
- Storage upload buckets are private and folder-scoped.
- Sensitive local password hashes are not exposed in admin data.
- Phase 18 smoke test passes.
