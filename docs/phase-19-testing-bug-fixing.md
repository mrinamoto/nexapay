# Phase 19 - Testing And Bug Fixing

## What We Built

Phase 19 adds a project-wide regression test, strengthens responsive and safety checks, and adds a small local preview server for beginner-friendly manual testing.

This phase does not remove or rebuild previous features. It verifies that the role dashboards, authentication demo behavior, transaction flows, validation rules, database security files, receipts, notifications, favorites, and responsive foundations still work together.

## Why It Is Needed

A portfolio project should not only look finished. It should be easy to verify.

Phase 19 gives NexaPay a repeatable testing routine so you can confidently make changes later and quickly catch broken pages, unsafe transaction behavior, missing files, or security regressions.

## Files Added

```text
tests/phase19-regression.mjs
tools/local-preview-server.mjs
docs/phase-19-testing-bug-fixing.md
```

## Files Updated

```text
README.md
docs/beginner-phase-guide.md
```

## What The Regression Test Checks

- All 39 HTML pages exist.
- Every page sets the correct `window.NEXAPAY_PAGE` value.
- Every page loads the shared JavaScript module.
- Every page has a responsive viewport tag.
- Core CSS breakpoints exist for mobile, narrow phones, and admin layout.
- The app renderer includes the educational demo disclaimer.
- Public, customer, merchant, agent, and admin routes are registered.
- Login, signup, logout, role guards, and demo password reset work.
- Admin data does not expose local password hashes.
- Admin self-suspension is rejected.
- Send Money, Request Money, Merchant Payment, Add Money, Cash Out, Recharge, Bill Payment, Bank Transfer, Savings, and Donation validations work.
- Successful flows create the correct transaction types.
- Receipts include the educational disclaimer.
- Notifications, favorites, and recent contacts work.
- Merchant and agent dashboards enforce role-specific behavior.
- RLS SQL blocks direct wallet and transaction mutations.
- Admin content RPC functions exist.

## Windows Commands

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
```

Run the syntax check:

```powershell
Get-ChildItem -Path js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tests -Filter *.mjs | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tools -Filter *.mjs | ForEach-Object { node --check $_.FullName }
```

Expected output:

```text
No output means no syntax errors were found.
```

Run all smoke and regression tests:

```powershell
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

Expected output:

```text
Phase 10 smoke test passed: Add Money, idempotency, Cash Out, fees, balances, and history are correct.
Phase 11 smoke test passed: recharge, bill payment, bank transfer, idempotency, metadata, fees, and history are correct.
Phase 12 smoke test passed: savings goals, progress, entries, withdrawals, donation receipts, idempotency, and history are correct.
Phase 13 smoke test passed: search, filters, status indicators, details lookup, summaries, and receipt text are correct.
Phase 14 smoke test passed: notifications, unread state, deletion, recent contacts, search, and favorites are correct.
Phase 15 smoke test passed: merchant protection, dashboard, stats, QR, search, receipts data, and profile management are correct.
Phase 16 smoke test passed: agent protection, customer search, cash-in, cash-out, stats, history, and audit records are correct.
Phase 17 smoke test passed: admin analytics, role protection, account controls, service management, promotions, announcements, settings, and audit logs are correct.
Phase 18 security smoke test passed: RLS, audited admin RPCs, storage policies, asset URL validation, and sensitive local data scrubbing are correct.
Phase 19 regression test passed: pages, roles, auth, validation rules, transaction flows, admin actions, responsive CSS, and security/database invariants are correct.
```

## Manual Preview Test

Start the local preview server:

```powershell
node tools\local-preview-server.mjs . 5173
```

Open this URL in your browser:

```text
http://127.0.0.1:5173
```

Use the demo role buttons on the login page:

```text
Customer
Merchant
Agent
Admin
```

## Manual Checklist

- Login page loads and shows the educational disclaimer.
- Signup page rejects weak demo input.
- Customer dashboard shows Demo Balance and quick actions.
- Send Money rejects zero, negative, over-precise, and self-send attempts.
- Valid demo transactions show receipts.
- Transaction history search and filters work.
- Notifications can be marked read and deleted.
- Favorites can be added and removed.
- Merchant dashboard shows payment stats and QR data.
- Agent dashboard can search registered demo customers.
- Admin dashboard shows analytics and account controls.
- Browser mobile view does not show horizontal overflow.
- Admin desktop layout is readable at desktop width.

## Common Errors And Fixes

Problem: `node is not recognized`

Fix: Install Node.js LTS from `https://nodejs.org`, close PowerShell, reopen it, and run the command again.

Problem: `Cannot find module`

Fix: Make sure you are inside the `outputs\nexapay` folder before running tests.

Problem: `address already in use`

Fix: Use a different preview port:

```powershell
node tools\local-preview-server.mjs . 5174
```

Then open:

```text
http://127.0.0.1:5174
```

Problem: A test fails after you edit demo data.

Fix: Read the error message first. Most tests name the exact broken feature, such as Send Money validation, favorites, merchant stats, or RLS policy text.

Problem: Supabase direct wallet edit still works.

Fix: Rerun:

```text
supabase/migrations/002_rpc_functions.sql
supabase/migrations/003_rls_policies.sql
```

Then test again as a normal non-admin user.

## Completion Checklist

- Syntax checks pass.
- Phase 10 through Phase 19 tests pass.
- All 39 pages are present.
- All role route maps are registered.
- Responsive CSS breakpoints are present.
- Educational disclaimer is rendered by the app.
- Transaction flows reject unsafe input.
- Successful transaction flows create correct ledger records.
- Receipts include demo disclaimers.
- Admin data hides sensitive local password fields.
- RLS policy file blocks direct balance and transaction edits.
- Local preview server works for manual testing.
