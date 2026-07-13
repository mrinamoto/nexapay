# Phase 17 - Admin Dashboard

## What We Built

Phase 17 turns the basic admin area into a full NexaPay admin console.

Admins can now review overview analytics, manage users, manage merchants, manage agents, search transactions, manage service content, create announcements, manage promotions, review audit logs, and update system settings.

The admin console is still an educational demo. It never shows passwords, never edits completed transaction history, and never processes real money.

## Why It Is Needed

A real wallet-style application needs operational tools. Admins should be able to manage content and account status without editing HTML files. This phase teaches:

- Role-protected admin pages
- Operational dashboards
- Account status controls
- Content management tables
- Announcement notifications
- Audit logging
- System settings stored in data instead of code

## Files Added

```text
pages/admin/admin-merchants.html
pages/admin/admin-agents.html
pages/admin/admin-announcements.html
js/services/admin-service.js
tests/phase17-smoke.mjs
docs/phase-17-admin-dashboard.md
```

## Files Updated

```text
js/pages/app.js
css/admin.css
js/services/demo-data.js
supabase/migrations/002_rpc_functions.sql
README.md
docs/beginner-phase-guide.md
docs/architecture.md
docs/security.md
docs/database-schema.md
supabase/README.md
```

## Admin Pages

```text
pages/admin/admin-dashboard.html
pages/admin/admin-users.html
pages/admin/admin-merchants.html
pages/admin/admin-agents.html
pages/admin/admin-transactions.html
pages/admin/admin-services.html
pages/admin/admin-announcements.html
pages/admin/admin-promotions.html
pages/admin/admin-audit-logs.html
pages/admin/admin-settings.html
```

## Supabase Setup

Run this again because Phase 17 adds admin RPC functions.

1. Open Supabase Dashboard.
2. Open your NexaPay project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Open `supabase/migrations/002_rpc_functions.sql` in VS Code.
6. Copy the full file.
7. Paste it into Supabase SQL Editor.
8. Click **Run**.
9. Confirm `supabase/migrations/003_rls_policies.sql` has already been run.

The important Phase 17 functions are:

```text
admin_set_profile_status
admin_set_managed_status
admin_create_announcement
admin_update_system_setting
```

## How To Run Locally On Windows 11

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open:

```text
http://localhost:5173/login.html
```

Click **Admin Demo**.

## How To Test Manually

1. Open **Admin Demo**.
2. Confirm Overview cards show users, merchants, agents, transactions, and demo money volume.
3. Open **Users**.
4. Suspend and reactivate a demo customer.
5. Open **Merchants**.
6. Suspend and reactivate a demo merchant.
7. Open **Agents**.
8. Confirm agent records appear.
9. Open **Transactions**.
10. Search for `Orion`.
11. Open **Services**.
12. Add a fictional recharge operator.
13. Open **Announcements**.
14. Send a customer announcement.
15. Open **Promotions**.
16. Add a fictional banner.
17. Open **Audit Logs**.
18. Confirm admin actions were logged.
19. Open **Settings**.
20. Update the starting demo balance setting.

## Automated Test

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
node tests\phase17-smoke.mjs
```

Expected output:

```text
Phase 17 smoke test passed: admin analytics, role protection, account controls, service management, promotions, announcements, settings, and audit logs are correct.
```

## Common Errors And Fixes

Problem: Admin page redirects to login.

Fix: Open `login.html` and click **Admin Demo**, or sign in with a Supabase user whose `profiles.role` is `admin`.

Problem: Supabase says a function does not exist.

Fix: Rerun the full `supabase/migrations/002_rpc_functions.sql` file in SQL Editor.

Problem: A normal user can see less data than the admin demo.

Fix: That is expected. Row Level Security hides unrelated rows unless the signed-in profile is an active admin.

Problem: A completed transaction cannot be edited.

Fix: That is intentional. Completed transaction history is view-only; corrections should be new auditable records.

## Completion Checklist

- Admin overview analytics show live demo totals.
- Admin can search and filter users.
- Admin can activate and suspend demo accounts.
- Admin can manage merchants and agents.
- Admin can search transactions without editing completed history.
- Admin can manage service categories, operators, bill providers, banks, and donation organizations.
- Admin can create announcements.
- Admin can manage promotions.
- Admin can view audit logs.
- Admin can update system settings.
- Phase 17 smoke test passes.
