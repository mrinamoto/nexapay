# Beginner Phase Guide

This guide follows the requested 21 phases. All paths are relative to the `nexapay` folder.

## Phase 1 - Planning, Architecture, Branding, Folder Structure

What: Create the fictional NexaPay brand and folder structure.
Why: A clean structure makes the app easier to understand and publish.
Files: `assets/logos/nexapay-logo.svg`, `assets/logos/nexapay-mark.svg`, project folders.
Windows command:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
tree /F
```

Test: Confirm folders such as `css`, `js`, `pages`, `supabase`, and `docs` exist.
Expected output: A complete folder tree.
Common error: Running the command from the wrong folder. Fix by using the exact `cd` command above.
Checklist: Brand exists, folder structure exists, disclaimer is planned.

## Phase 2 - Global CSS And Components

What: Add variables, reset, global styles, cards, buttons, forms, mobile shell, and admin layout.
Why: Reusable CSS keeps the UI consistent.
Files: `css/*.css`.
Test: Start the server and open `http://localhost:5173`.
Expected output: A polished NexaPay landing screen.
Checklist: Mobile layout works, buttons are styled, focus states are visible.

## Phase 3 - Authentication Pages

What: Add login, signup, forgot password, reset password.
Why: Users need sessions before wallet actions.
Files: `login.html`, `signup.html`, `forgot-password.html`, `reset-password.html`, `js/auth/auth-service.js`.
Test: Click a demo role on the login page.
Expected output: You enter the matching dashboard.
Checklist: Sign up form exists, login form exists, no real OTP is requested.

## Phase 4 - Customer Dashboard UI

What: Build balance card, quick actions, favorites, promotions, recent transactions.
Why: This is the main customer home screen.
Files: `pages/customer/dashboard.html`, `js/pages/app.js`.
Test: Use Customer demo.
Expected output: Demo Balance shows `৳25,000` or the current local demo balance.
Checklist: Disclaimer visible, quick actions visible, balance can be hidden.

## Phase 5 - Supabase Project And Schema

What: Create Supabase project and run schema SQL.
Why: Postgres stores users, wallets, transactions, content, and logs.
Files: `supabase/migrations/001_schema.sql`, `supabase/seed.sql`, `supabase/demo-seed-after-auth.sql`.
Supabase steps:

1. Open Supabase Dashboard.
2. Click **New project**.
3. Enter project name `nexapay`.
4. Save the database password somewhere private.
5. Wait until the project is ready.
6. Open **SQL Editor**.
7. Click **New query**.
8. Paste all SQL from `001_schema.sql`.
9. Click **Run**.
10. Open a new query.
11. Paste all SQL from `seed.sql`.
12. Click **Run**.

Optional demo user seed:

1. Create fictional users in **Authentication > Users**.
2. Open a new query.
3. Paste all SQL from `demo-seed-after-auth.sql`.
4. Click **Run**.

Detailed guide: `docs/phase-05-supabase-database-schema.md`.

Test: Open **Table Editor** and confirm tables exist.
Checklist: `profiles`, `wallets`, `transactions`, requests, merchants, agents, savings, notifications, promotions, and audit logs exist.

## Phase 6 - Auth Integration And Automatic Profile/Wallet Creation

What: Connect signup, login, logout, password reset, session persistence, role assignment rules, and automatic demo wallet creation to Supabase Auth.
Why: A new user should not need manual database setup, and the browser should never directly create wallet balances in production mode.
Files: `js/auth/auth-service.js`, `js/pages/app.js`, `js/config/supabase.js`, `supabase/migrations/004_auth_integration.sql`.
Steps:

1. Open **SQL Editor**.
2. Run `001_schema.sql`, `seed.sql`, and `004_auth_integration.sql`.
3. Open **Authentication > URL Configuration**.
4. Set local Site URL to `http://127.0.0.1:5173`.
5. Add redirect URL `http://127.0.0.1:5173/reset-password.html`.
6. Add redirect URL `http://127.0.0.1:5173/login.html`.
7. Open **Project Settings > API**.
8. Copy **Project URL**.
9. Copy **anon public key**.
10. Open `js/config/supabase.js`.
11. Replace `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Test: Sign up with a demo email.
Expected output: A Supabase Auth user, profile row, wallet row, and welcome notification are created.
Detailed guide: `docs/phase-06-authentication-integration.md`.
Checklist: Session persists after refresh, logout works, reset password starts recovery, no service-role key is in frontend code.

## Phase 7 - Secure Send Money

What: Multi-step Send Money flow plus secure `transfer_demo_money` RPC.
Why: Transfers must be atomic and ledger-safe. Frontend JavaScript must not directly update Supabase wallet balances.
Files: `pages/customer/send-money.html`, `js/services/send-money-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.
5. If not already done, paste and run `supabase/migrations/003_rls_policies.sql`.

Detailed guide: `docs/phase-07-secure-send-money.md`.
Test: Login as one demo customer and send `100` demo taka to another registered demo customer.
Expected output: Sender balance decreases by amount plus fee, receiver balance increases, transaction row exists, notifications are created.
Checklist: Rejects negative amount, rejects zero amount, rejects sending to yourself, rejects insufficient balance, stable idempotency key exists.

## Phase 8 - Receive Money And Request Money

What: Personal QR, internal demo payment link, request creation, pending requests, accept, decline, and cancel.
Why: Wallet apps need incoming payment workflows, and accepted requests must use secure transfer logic.
Files: `pages/customer/request-money.html`, `js/services/request-money-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.

Detailed guide: `docs/phase-08-receive-request-money.md`.
Test: Create a request from Customer A to Customer B, then login as Customer B and accept or decline it.
Expected output: Accepted requests create a secure simulated transfer; declined and cancelled requests only update status.
Checklist: Personal QR appears, internal link appears, pending/accepted/declined/cancelled statuses work.

## Phase 9 - Merchant Payment And QR Simulation

What: Merchant search, merchant payment, merchant QR generation, QR reading simulation, confirmation, and receipts.
Why: Demonstrates merchant receiver workflows while keeping QR data safe and internal.
Files: `pages/customer/payment.html`, `pages/customer/scan.html`, `pages/merchant/merchant-qr.html`, `js/services/merchant-payment-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.

Detailed guide: `docs/phase-09-merchant-payment-qr.md`.
Test: Use sample QR text `NEXAPAY:MERCHANT:NPM-1001`.
Expected output: Merchant loads, payment succeeds, merchant balance increases, and payment receipt appears.
Checklist: QR contains no secrets, transaction type is `merchant_payment`, frontend does not directly update Supabase wallet balances.

## Phase 10 - Add Money And Cash Out

What: Fictional funding sources, predefined Add Money amounts, registered demo-agent search, Cash Out fees, confirmation, receipts, and secure balance updates.
Why: Shows wallet funding and agent withdrawal patterns without connecting to real banks, cards, cash, or payment networks.
Files: `pages/customer/add-money.html`, `pages/customer/cash-out.html`, `js/services/funding-service.js`, `js/services/wallet-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`, `tests/phase10-smoke.mjs`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.
5. Confirm an active fictional user exists in both `profiles` and `agents` with an active wallet.

Detailed guide: `docs/phase-10-add-money-cash-out.md`.
Test: Add 1,000 demo taka, then cash out 250 through a registered demo agent.
Expected output: Add Money credits 1,000; Cash Out deducts 252.50 from the customer, credits 250 to the agent, and creates demo receipts.
Checklist: No card number, CVV, bank password, real PIN, or real cash claim; no direct frontend wallet update.

## Phase 11 - Recharge, Bills, Bank Transfer

What: Multi-step fictional telecom, bill, and bank flows with demo receipts.
Why: Shows service payment modeling without connecting to real service providers.
Files: `js/services/service-payment-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`, `seed.sql`, `tests/phase11-smoke.mjs`.
Test: Complete one recharge, one bill payment, and one bank transfer; then run `node tests\phase11-smoke.mjs`.
Expected output: Transaction history includes recharge, bill payment, and bank transfer with service-specific receipt details.
Checklist: All providers are fictional; no OTP, card, bank password, or real provider account is requested.

## Phase 12 - Savings And Donation

What: Savings goals, deposits, withdrawals, progress history, and fictional donations.
Why: Demonstrates sub-ledger logic, goal tracking, service-style payments, receipts, and RPC-protected balance movement.
Files: `js/services/savings-service.js`, `js/services/donation-service.js`, `js/pages/app.js`, `supabase/migrations/002_rpc_functions.sql`, `tests/phase12-smoke.mjs`.
Test: Create a goal, deposit demo money, withdraw part of it, donate to a fictional organization, then run `node tests\phase12-smoke.mjs`.
Expected output: Progress and goal history update; receipts and transaction history include savings and donation records.
Checklist: Donation organizations are clearly fictional; savings movement never directly updates wallet balance from frontend JavaScript in Supabase mode.

## Phase 13 - Transaction History And Receipts

What: Search, filters, status indicators, money-in/money-out views, transaction details, and print/download/share demo receipts.
Why: Users need traceability, and learners need to understand how ledger records become readable receipts.
Files: `js/services/transaction-service.js`, `js/pages/app.js`, `css/transaction.css`, `tests/phase13-smoke.mjs`.
Test: Search for `Orion Mart`, filter by Failed, open a transaction, click Download, then run `node tests\phase13-smoke.mjs`.
Expected output: Filtered records appear, detail view opens, and a text receipt downloads with the educational disclaimer.
Checklist: Receipt contains educational disclaimer; no receipt claims real payment proof.

## Phase 14 - Notifications And Favorites

What: In-app notification center, read/unread state, mark all as read, delete, favorite contacts, recent contacts, and safe demo contact search.
Why: Improves wallet usability while teaching per-user data ownership, RLS-safe updates, and contact lists that do not import real device contacts.
Files: `js/services/notification-service.js`, `js/services/contact-service.js`, `js/pages/app.js`, `css/components.css`, `css/dashboard.css`, `css/responsive.css`, `supabase/migrations/002_rpc_functions.sql`, `tests/phase14-smoke.mjs`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.
5. Confirm `supabase/migrations/003_rls_policies.sql` has already been run.

Detailed guide: `docs/phase-14-notifications-favorites.md`.
Test: Mark notifications read/unread, delete one notification, search for `Mira`, add and remove her as a favorite, then run `node tests\phase14-smoke.mjs`.
Expected output: Notification counts update, deleted notifications disappear, favorites update, recent contacts are derived from demo transactions.
Checklist: Users only manage their own favorites/notifications; no real device contacts are accessed.

## Phase 15 - Merchant Dashboard

What: Merchant role protection, demo balance, payment statistics, seven-day chart, recent payments, searchable payment history, safe QR generation, receipts, and merchant profile management.
Why: Merchants need incoming payment visibility and safe business-profile controls without real payment gateway or settlement integrations.
Files: `pages/merchant/*`, `js/services/merchant-service.js`, `js/pages/app.js`, `css/dashboard.css`, `css/responsive.css`, `css/transaction.css`, `tests/phase15-smoke.mjs`.
Supabase steps:

1. Open **Table Editor > profiles** and confirm the merchant user has `role = merchant`.
2. Open **Table Editor > merchants** and confirm `owner_id` matches the merchant Auth user ID.
3. Open **Table Editor > wallets** and confirm the merchant has a wallet row.
4. Confirm `supabase/migrations/003_rls_policies.sql` has already been run.

Detailed guide: `docs/phase-15-merchant-dashboard.md`.
Test: Use the Merchant demo, search payments for `Ava`, open a receipt, copy the QR payload, update the merchant profile, then run `node tests\phase15-smoke.mjs`.
Expected output: Merchant dashboard shows balance and stats, payment search filters records, receipts open, QR contains only a safe merchant identifier, and profile edits save.
Checklist: Merchant pages are role-protected; merchant cannot see passwords or collect real bank/payment credentials.

## Phase 16 - Agent Dashboard

What: Agent role protection, demo balance, customer search, cash-in simulation, cash-out simulation, daily statistics, searchable history, receipts, and audit records.
Why: Agent role teaches assisted transaction workflows while preserving secure backend-owned wallet movement.
Files: `pages/agent/*`, `js/services/agent-service.js`, `js/pages/app.js`, `js/services/transaction-service.js`, `supabase/migrations/002_rpc_functions.sql`, `tests/phase16-smoke.mjs`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.
5. Confirm the agent Auth user has `role = agent`, an active `agents` row, and an active wallet.

Detailed guide: `docs/phase-16-agent-dashboard.md`.
Test: Use the Agent demo, search for a customer, process cash-in, process cash-out, filter History, then run `node tests\phase16-smoke.mjs`.
Expected output: Agent/customer demo balances update through service/RPC logic, history shows cash-in and cash-out records, and audit records are created.
Checklist: Agent only chooses registered demo users; no real cash, OTP, PIN, or financial credential is collected.

## Phase 17 - Admin Dashboard

What: Overview analytics, users, merchants, agents, transactions, services, providers, operators, promotions, announcements, audit logs, account status controls, and system settings.
Why: Admin content should not require HTML edits, and sensitive operations should be role-protected and auditable.
Files: `pages/admin/*`, `js/services/admin-service.js`, `js/pages/app.js`, `css/admin.css`, `supabase/migrations/002_rpc_functions.sql`, `tests/phase17-smoke.mjs`.
Supabase steps:

1. Open **SQL Editor**.
2. Click **New query**.
3. Paste all SQL from `supabase/migrations/002_rpc_functions.sql`.
4. Click **Run**.
5. Confirm `supabase/migrations/003_rls_policies.sql` has already been run.
6. Open **Table Editor > profiles**.
7. Confirm your admin user has `role = admin` and `account_status = active`.

Detailed guide: `docs/phase-17-admin-dashboard.md`.
Test: Use Admin demo, suspend/reactivate a user, add a fictional service item, create an announcement, view audit logs, then run `node tests\phase17-smoke.mjs`.
Expected output: Admin dashboard shows analytics and management screens; status changes and content actions create audit logs.
Checklist: Admin can activate/suspend demo accounts, manage merchants/agents/services/promotions/announcements/settings, search transactions, and cannot silently edit completed transaction history.

## Phase 18 - Security Review And RLS

What: Complete security audit, hardened RLS policies, audited admin RPCs, role protection, direct balance-edit blocking, storage policies, and sensitive local-data scrubbing.
Why: Frontend route protection is not enough. Supabase must enforce ownership, roles, and transaction safety with the public anon key.
Files: `supabase/migrations/003_rls_policies.sql`, `supabase/migrations/002_rpc_functions.sql`, `js/utils/security.js`, `tests/phase18-security-smoke.mjs`, `docs/security.md`, `docs/phase-18-security-review-rls.md`.
Supabase steps:

1. Open **SQL Editor**.
2. Run `supabase/migrations/002_rpc_functions.sql`.
3. Open a new query.
4. Run `supabase/migrations/003_rls_policies.sql`.
5. Open **Table Editor > wallets**.
6. Confirm normal users cannot directly edit `balance`.
7. Open **Table Editor > transactions**.
8. Confirm normal users cannot directly insert or update transaction rows.
9. Open **Storage**.
10. Confirm buckets `profile-images` and `merchant-logos` exist.

Detailed guide: `docs/phase-18-security-review-rls.md`.
Test: Run `node tests\phase18-security-smoke.mjs`, then use Supabase as a normal customer and confirm wallet and transaction direct edits are blocked.
Expected output: RLS blocks unsafe direct writes; admin actions go through audited RPC functions.
Checklist: RLS enabled, direct wallet edits blocked, direct transaction edits blocked, admin writes audited, storage bucket policies installed, local password hashes hidden from admin data.

## Phase 19 - Testing And Bug Fixing

What: Run project-wide syntax checks, role-flow smoke tests, transaction validation tests, security checks, and manual preview checks.
Why: Portfolio projects should be reliable, and future changes should not quietly break old features.
Files: `tests/phase19-regression.mjs`, `tools/local-preview-server.mjs`, `docs/phase-19-testing-bug-fixing.md`.
Commands:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
Get-ChildItem -Path js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tests -Filter *.mjs | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tools -Filter *.mjs | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

Manual preview:

```powershell
node tools\local-preview-server.mjs . 5173
```

Open:

```text
http://127.0.0.1:5173
```

Expected output: Phase 10 through Phase 19 tests all print `passed`, and the local app opens in the browser.
Detailed guide: `docs/phase-19-testing-bug-fixing.md`.
Checklist: Syntax checks pass, all smoke tests pass, Phase 19 regression passes, all 39 pages exist, role guards work, transaction validation works, responsive viewport tags exist, RLS policy checks pass, and manual preview loads.

## Phase 20 - GitHub Upload Preparation

What: Clean the project for GitHub, protect secrets, update public documentation, and prepare exact Git upload commands.
Why: Portfolio projects should be easy to review and must not expose private keys, database passwords, or real credentials.
Files: `.gitignore`, `.env.example`, `.gitattributes`, `LICENSE`, `SECURITY.md`, `README.md`, `docs/phase-20-github-upload-preparation.md`.

Final checks:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' "service[_-]?role|SUPABASE_SERVICE|DATABASE_URL|postgres://|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY|REAL_PAYMENT_GATEWAY_SECRET"
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

New GitHub repository upload:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
git init
git branch -M main
git status
git add .
git status
git commit -m "Prepare NexaPay educational wallet simulator"
git remote add origin https://github.com/YOUR-USERNAME/nexapay.git
git push -u origin main
```

Existing GitHub repository update:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
git status
git add .
git status
git commit -m "Complete Phase 20 GitHub upload preparation"
git pull --rebase origin main
git push origin main
```

Expected output: Phase 10 through Phase 21 tests pass, then Git commits the clean project and uploads it to GitHub.
Detailed guide: `docs/phase-20-github-upload-preparation.md`.
Checklist: `.env` is ignored, `.env.example` uses placeholders only, no service-role key is committed, README is professional, security notes exist, tests pass, and upload commands are ready.

## Phase 21 - Free Deployment

What: Prepare and deploy NexaPay with GitHub Pages, plus Supabase production Auth URLs and troubleshooting.
Why: A public demo is stronger for a portfolio, and deployed Auth redirects must point back to the correct public pages.
Files: `.nojekyll`, `404.html`, `docs/phase-21-free-deployment.md`, `tests/phase21-deployment-prep.mjs`.

Final deployment test:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
node tests\phase21-deployment-prep.mjs
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

Supabase production settings:

1. Open Supabase Dashboard.
2. Open your NexaPay project.
3. Click **Authentication**.
4. Click **URL Configuration**.
5. Set **Site URL** to `https://YOUR-USERNAME.github.io/nexapay/`.
6. Add Redirect URLs:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/login.html
http://127.0.0.1:5173/reset-password.html
http://localhost:5173/
http://localhost:5173/login.html
http://localhost:5173/reset-password.html
https://YOUR-USERNAME.github.io/nexapay/
https://YOUR-USERNAME.github.io/nexapay/login.html
https://YOUR-USERNAME.github.io/nexapay/reset-password.html
```

GitHub Pages steps:

1. Push the project to GitHub.
2. Open repository on GitHub.
3. Go to **Settings > Pages**.
4. Choose **Deploy from a branch**.
5. Choose branch `main`.
6. Choose folder `/ (root)`.
7. Click **Save**.

Cloudflare Pages alternative:

1. Open Cloudflare Dashboard.
2. Click **Workers & Pages**.
3. Click **Create application > Pages**.
4. Connect your GitHub repo.
5. Leave build command blank.
6. Set output directory to `/`.
7. Click **Deploy**.

Expected output: A public NexaPay demo URL such as `https://YOUR-USERNAME.github.io/nexapay/`.
Detailed guide: `docs/phase-21-free-deployment.md`.
Checklist: `.nojekyll` exists, `404.html` exists, Supabase redirect URLs include the deployed pages, public anon key only is used, Phase 10 through Phase 21 tests pass, and the public page displays the educational disclaimer.
