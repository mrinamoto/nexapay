# Phase 14 - Notifications And Favorites

## What We Built

Phase 14 adds a fuller in-app notification center and contact management experience:

- Read/unread notification state.
- Mark one notification as read or unread.
- Mark all notifications as read.
- Delete notifications.
- Favorite contacts.
- Recent contacts derived from simulated transaction history.
- Demo contact search by fictional name or demo phone number.
- Supabase-aware services for notifications and favorites.
- A `list_demo_favorites()` RPC helper so users can list their own favorites without opening the full profiles table.

NexaPay still never imports real device contacts.

## Why This Is Needed

Real wallet apps need fast access to trusted recipients and clear activity alerts. In this educational simulator, notifications and favorites teach:

- Per-user data ownership.
- Read/update/delete patterns with RLS.
- Search against safe public profile fields.
- Recent-contact logic from transaction history.
- Why contact lists should not come from a user's real phone without explicit permission.

## Files Added Or Updated

Create or update these files inside:

```text
C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
```

Updated:

- `js/pages/app.js`
- `css/components.css`
- `css/dashboard.css`
- `css/responsive.css`
- `supabase/migrations/002_rpc_functions.sql`
- `docs/beginner-phase-guide.md`
- `docs/security.md`
- `README.md`
- `supabase/README.md`

Added:

- `js/services/notification-service.js`
- `js/services/contact-service.js`
- `tests/phase14-smoke.mjs`
- `docs/phase-14-notifications-favorites.md`

## Folder Structure After This Phase

```text
nexapay/
├── css/
│   ├── components.css
│   ├── dashboard.css
│   └── responsive.css
├── docs/
│   └── phase-14-notifications-favorites.md
├── js/
│   ├── pages/
│   │   └── app.js
│   └── services/
│       ├── contact-service.js
│       └── notification-service.js
├── supabase/
│   └── migrations/
│       └── 002_rpc_functions.sql
└── tests/
    └── phase14-smoke.mjs
```

## Supabase Setup

Run this after the Phase 5, 6, 7, and 18 SQL files are already installed.

1. Open [Supabase](https://supabase.com).
2. Open your NexaPay project.
3. Click **SQL Editor** in the left sidebar.
4. Click **New query**.
5. Open `supabase/migrations/002_rpc_functions.sql` in VS Code.
6. Select all SQL in that file.
7. Paste it into Supabase SQL Editor.
8. Click **Run**.

This installs or updates:

- `search_demo_profiles`
- `list_demo_favorites`
- notification-producing transaction functions from earlier phases

The existing RLS policies still control:

- Users read/update/delete only their own notifications.
- Users manage only their own favorites.
- Users do not get broad direct access to all profiles.

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

## How To Test Manually

1. Open the app.
2. Log in with the Customer demo role.
3. Open **Notifications**.
4. Click **Mark read** on one unread item.
5. Click **Mark unread** on that same item.
6. Click **Mark all read**.
7. Delete one notification.
8. Open **Profile**.
9. Review favorite contacts.
10. Review recent contacts.
11. Search for `Mira`.
12. Add Mira to favorites.
13. Remove Mira from favorites.

Expected output:

- Notification badges update.
- Deleted notifications disappear.
- Favorite contacts update immediately.
- Recent contacts are built from demo transaction history.
- The profile page says real device contacts are not imported.

## Automated Test

Run:

```powershell
node tests\phase14-smoke.mjs
```

Expected output:

```text
Phase 14 smoke test passed: notifications, unread state, deletion, recent contacts, search, and favorites are correct.
```

## Common Errors And Solutions

**Error: function list_demo_favorites does not exist**

Run `supabase/migrations/002_rpc_functions.sql` again in Supabase SQL Editor.

**Favorites work locally but not in Supabase**

Confirm `supabase/migrations/003_rls_policies.sql` has been run. The `favorites` table needs the "Users manage own favorites" policy.

**Contact search shows no results**

Confirm demo profiles exist in the `profiles` table and their `account_status` is `active`.

**Notifications do not update**

Confirm the logged-in Auth user ID matches the `notifications.user_id` value. RLS hides another user's notifications by design.

## Completion Checklist

- [x] Notifications can be read, unread, marked all read, and deleted.
- [x] Favorites can be added and removed.
- [x] Recent contacts come from simulated transaction history.
- [x] Contact search uses registered fictional demo users only.
- [x] Supabase mode uses RLS-safe table access and RPC helpers.
- [x] No real device contacts are accessed.
- [x] Smoke test added.
