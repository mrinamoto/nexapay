# Security Review

NexaPay is a demo application, but the database design follows real safety patterns.

## Explicit Safety Boundaries

- No real money.
- No real payment gateway.
- No real bank integration.
- No real mobile recharge.
- No real OTP delivery.
- No collection of bank passwords, card numbers, CVV, NID, or financial PINs.

## Main Risks And Controls

### Direct Balance Manipulation

Risk: A user could try to update `wallets.balance` from browser code.

Control: RLS does not allow normal users to update wallet balances. Balance changes happen through `security definer` RPC functions.

Phase 18 detail: There are no direct `insert`, `update`, or `delete` RLS policies on `wallets`.

### Double Spending

Risk: Two transfers could use the same balance at the same time.

Control: RPC functions lock wallet rows with `for update`, validate balance, then write the transaction in the same database transaction.

### Duplicate Submission

Risk: A user double-clicks Confirm or refreshes during submission.

Control: `transactions.idempotency_key` is unique. The RPC returns the existing transaction when the same key appears again. Money requests also use `money_requests.idempotency_key` to avoid duplicate pending requests.

### Request Ownership

Risk: A user accepts, declines, or cancels a request that does not belong to them.

Control: Request RPC functions verify ownership: only the receiver can accept or decline, only the requester can cancel, and only pending requests can change state.

Phase 18 detail: Money requests are no longer directly inserted or updated by frontend table policies. They are handled through RPC functions.

### QR Payload Safety

Risk: A QR code could accidentally expose secrets.

Control: NexaPay merchant QR payloads contain only safe internal merchant identifiers such as `NEXAPAY:MERCHANT:NPM-1001`. They never encode passwords, tokens, bank data, or credentials.

### Fake Funding Source Abuse

Risk: A user submits an arbitrary Add Money amount or disguises an unknown funding source as a trusted source.

Control: `add_demo_money` accepts only predefined amounts and an explicit fictional-source allowlist. It enforces an authenticated wallet, a daily demo limit, and a user-scoped idempotency check before crediting the balance.

### Unregistered Cash-Out Agent

Risk: A user attempts to cash out to a profile that is not an active registered demo agent.

Control: `cash_out_demo_money` resolves the receiver from the protected `agents` table. The core transfer function independently confirms the receiver has an active agent registration before locking wallets and moving demo balance.

### Agent-Assisted Cash-In And Cash-Out

Risk: An agent could attempt to process assisted transactions without being an active registered demo agent, choose an invalid customer, duplicate a request, or move balances outside the ledger.

Control: `agent_cash_in_demo_money` and `agent_cash_out_demo_money` verify the signed-in user is an active agent, verify the selected customer is an active customer, validate amount limits, lock both wallets, apply idempotency, create transaction rows, create notifications, and write audit logs inside the database function.

### Service Provider Spoofing

Risk: A user submits a recharge, bill, or bank transfer payload with an unknown provider, bank, or operator.

Control: `service_payment` validates the selected fictional operator, bill category, bill provider, or bank against active database rows. It also checks service-specific limits, the idempotency key, wallet status, and available demo balance before deducting money.

### Savings Progress Tampering

Risk: A user directly edits a savings goal's `current_amount` instead of making a real demo deposit or withdrawal.

Control: Users can read their own savings goals, but Supabase savings movement is handled by `move_savings_goal_money`. The function locks the wallet and goal, validates available balance or saved amount, writes the transaction, writes the savings history entry, and updates progress atomically.

### Donation Organization Spoofing

Risk: A user submits a donation transaction with an unknown or inactive organization.

Control: Donation submissions go through `service_payment`, which validates the organization against `donation_organizations` before creating a transaction.

### Receipt Misinterpretation

Risk: A demo receipt could be mistaken for real payment proof.

Control: Every generated receipt and downloaded receipt text includes the educational demo disclaimer and states that it is proof of a simulated database event only.

### Notification And Favorite Privacy

Risk: A user could read another user's alerts or manage another user's saved contacts.

Control: Notification RLS allows users to select, update, and delete only rows where `user_id = auth.uid()`. Favorites use the same ownership rule. The `list_demo_favorites()` RPC returns only the signed-in user's saved favorites with safe profile fields, and NexaPay never imports real device contacts.

### Merchant Profile And Payment Visibility

Risk: A non-merchant user could open merchant tools, or a merchant profile form could collect real settlement credentials.

Control: Merchant pages use role-based route protection, and Supabase merchant rows are protected by owner/admin RLS. The merchant profile form only updates safe demo fields such as business name, category, owner name, demo phone, and avatar URL. It never asks for bank accounts, payment gateway keys, tax IDs, trade licenses, real settlement information, or passwords.

Phase 18 detail: A database trigger prevents merchant owners from changing `owner_id`, `merchant_code`, `qr_identifier`, `status`, or `created_at`.

### Role Spoofing

Risk: A user changes a local role value in the browser.

Control: Supabase authorization checks database profile roles through `public.is_admin()` and RLS policies.

### Admin Overreach

Risk: Admin silently edits completed transaction history.

Control: Completed transaction rows are view-only in the intended admin UI. Corrections should be new auditable records, not edits.

### Admin Management Authorization

Risk: A user opens an admin page or calls an admin action from the browser without being a real admin.

Control: Admin UI route protection is only a convenience. Supabase admin actions use `public.is_admin()` inside RLS policies and security-definer RPC functions. The Phase 17 admin RPC functions check the signed-in profile before changing account status, managed content status, announcements, or system settings.

Phase 18 detail: Admin content and promotion saves now use audited RPC functions: `admin_save_managed_item` and `admin_save_promotion`. Direct broad `for all` admin table policies were removed from the RLS migration.

### Admin Self-Suspension

Risk: An admin accidentally suspends their own active admin account and locks themselves out of the demo console.

Control: `admin_set_profile_status` rejects self-suspension for the current admin.

### Admin Content Accountability

Risk: Admin changes service providers, promotions, announcements, or settings without traceability.

Control: Phase 17 admin actions write `audit_logs` entries. Announcements become normal in-app notifications, and settings live in `system_settings` instead of hidden frontend code.

### Upload Safety

Risk: Users upload unsafe files, overwrite another user's files, or expose private assets.

Control: Phase 18 creates private Supabase Storage buckets for `profile-images` and `merchant-logos`. Upload policies require authenticated users and folder ownership. Profile images are scoped by `auth.uid()`, and merchant logos are scoped by merchant ID owned by the signed-in merchant.

### Unsafe Avatar URLs

Risk: A profile image URL points to an unsafe scheme such as `javascript:` or `data:`.

Control: Avatar/logo URL fields are validated in frontend helpers. NexaPay accepts blank values, HTTPS URLs, or project asset paths only.

### Local Demo Password Hash Exposure

Risk: Local demo signup stores salted password hashes in browser storage, and admin tooling could accidentally expose them.

Control: Phase 18 strips `password_hash` and `password_salt` from profiles returned by the admin data service.

## Production Notes

Before using this as a public portfolio demo:

1. Keep service-role keys out of frontend code.
2. Review RLS policies in Supabase SQL Editor.
3. Use Supabase Auth email verification if you want verified accounts.
4. Do not ask users for real financial credentials.
5. Keep the educational disclaimer visible on every page.
