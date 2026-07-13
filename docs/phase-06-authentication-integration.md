# Phase 6 - Authentication Integration And Automatic Profile/Wallet Creation

## What We Are Building

Phase 6 connects the existing NexaPay auth screens to Supabase Auth. When Supabase keys are configured, signup and login use Supabase. When keys are still placeholders, the project keeps using the local browser demo so beginners can continue learning without breaking the app.

Every new Supabase signup automatically creates:

- one `profiles` row
- one `wallets` row
- one welcome `notifications` row
- the default `customer` role
- a configurable fake starting demo balance

## Why It Is Needed

Auth users live in Supabase Auth, but wallet app data lives in Postgres tables. The app needs a safe bridge between them. NexaPay uses a database trigger named `on_auth_user_created`, so profile and wallet creation happens on the backend, not from editable frontend JavaScript.

## Final Folder Structure For This Phase

```text
nexapay/
├── login.html
├── signup.html
├── forgot-password.html
├── reset-password.html
├── js/
│   ├── auth/
│   │   └── auth-service.js
│   ├── config/
│   │   └── supabase.js
│   └── pages/
│       └── app.js
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_rpc_functions.sql
│   │   ├── 003_rls_policies.sql
│   │   └── 004_auth_integration.sql
│   └── seed.sql
└── docs/
    └── phase-06-authentication-integration.md
```

## Files Created Or Updated

- `js/auth/auth-service.js`
- `js/pages/app.js`
- `supabase/migrations/004_auth_integration.sql`
- `docs/phase-06-authentication-integration.md`
- `README.md`
- `docs/beginner-phase-guide.md`
- `supabase/README.md`

## Step 1 - Run The Database SQL

Open your Supabase project.

1. Click **SQL Editor**.
2. Click **New query**.
3. Open `supabase/migrations/001_schema.sql` in VS Code.
4. Copy the full file.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.
7. Open another **New query**.
8. Open `supabase/seed.sql`.
9. Copy the full file.
10. Paste it into Supabase SQL Editor.
11. Click **Run**.
12. Open another **New query**.
13. Open `supabase/migrations/004_auth_integration.sql`.
14. Copy the full file.
15. Paste it into Supabase SQL Editor.
16. Click **Run**.

Expected result: Supabase shows success messages and the trigger `on_auth_user_created` exists.

## Step 2 - Configure Supabase Auth Redirects

In Supabase:

1. Click **Authentication**.
2. Click **URL Configuration**.
3. Set **Site URL** to:

```text
http://127.0.0.1:5173
```

4. Add these **Redirect URLs**:

```text
http://127.0.0.1:5173/reset-password.html
http://127.0.0.1:5173/login.html
http://localhost:5173/reset-password.html
http://localhost:5173/login.html
```

5. After deployment, add your public demo URLs too, for example:

```text
https://YOUR-USERNAME.github.io/nexapay/reset-password.html
https://YOUR-USERNAME.github.io/nexapay/login.html
https://YOUR-CLOUDFLARE-PAGES-DOMAIN.pages.dev/reset-password.html
https://YOUR-CLOUDFLARE-PAGES-DOMAIN.pages.dev/login.html
```

6. Click **Save**.

## Step 3 - Copy Supabase Public Keys

In Supabase:

1. Click **Project Settings**.
2. Click **API**.
3. Copy **Project URL**.
4. Copy **anon public** key.
5. Open this file in VS Code:

```text
js/config/supabase.js
```

6. Replace the placeholders:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```

with your actual Project URL and anon public key.

Do not paste the service-role key into this file.

## Step 4 - Run The Project On Windows 11

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
py -m http.server 5173
```

Open your browser:

```text
http://127.0.0.1:5173/signup.html
```

## Step 5 - Test Signup

Use fictional demo information only:

```text
Full name: Test Customer
Email: test.customer@example.test
Phone: 01710000991
Password: DemoPass123
```

Expected result:

- Signup succeeds.
- You are sent to the customer dashboard if email confirmation is off.
- If email confirmation is on, Supabase asks you to confirm the email before login.
- The balance is labeled as a demo balance.

## Step 6 - Confirm Automatic Profile And Wallet

In Supabase:

1. Click **Authentication**.
2. Click **Users**.
3. Confirm the new Auth user exists.
4. Click **Table Editor**.
5. Open `profiles`.
6. Confirm the new user has a profile row.
7. Open `wallets`.
8. Confirm the same user has a wallet row.
9. Open `notifications`.
10. Confirm the welcome notification exists.

Expected wallet balance:

```text
25000.00
```

unless you changed `system_settings.starting_demo_balance`.

## Step 7 - Test Login, Logout, And Session Persistence

1. Open `login.html`.
2. Log in with the same demo email and password.
3. Refresh the dashboard.
4. Confirm you stay logged in.
5. Open the Profile page.
6. Click **Logout**.
7. Confirm the app returns to login.

Expected result: Supabase keeps the session until logout.

## Step 8 - Test Password Reset

In the app:

1. Open `forgot-password.html`.
2. Enter the demo email.
3. Click **Continue to demo reset**.

In Supabase mode, Supabase sends a recovery email if email delivery is configured. Open the latest recovery link, then set the new password on `reset-password.html`.

Local fallback mode does not send email. It opens an in-browser reset page only.

## Role Assignment

New public signups always receive the `customer` role. Do not let users choose `admin`, `merchant`, or `agent` from signup metadata.

For the first admin, use trusted SQL in Supabase SQL Editor after creating that Auth user:

```sql
update public.profiles
set role = 'admin',
    updated_at = now()
where email = 'admin@example.test';

insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
select id, 'bootstrap_admin_role', 'profile', id::text, '{"source":"trusted_sql"}'::jsonb
from public.profiles
where email = 'admin@example.test';
```

After an admin exists, app-level admin tools can call:

```sql
select public.assign_demo_role('TARGET-USER-UUID', 'merchant');
```

That helper checks the logged-in user with `auth.uid()`, requires an active admin profile, updates the role, and writes an audit log.

## Common Errors And Fixes

**Error: Supabase is still in local demo mode**

Fix: Check `js/config/supabase.js`. The Project URL must not contain `YOUR-PROJECT-REF`, and the anon key must not contain `YOUR_PUBLIC_ANON_KEY`.

**Error: Profile or wallet was not ready yet**

Fix: Confirm `001_schema.sql` and `004_auth_integration.sql` were run. Then sign up again with a new fictional email and phone number.

**Error: Database error saving new user**

Fix: The phone number may already exist in `profiles`. Use a different fictional demo phone number.

**Error: Password reset link redirects to the wrong page**

Fix: Add the exact local or deployed `reset-password.html` URL in **Authentication > URL Configuration > Redirect URLs**.

**Error: Service-role key exposed**

Fix: Remove it immediately, rotate the key in Supabase, and only keep the anon public key in frontend code.

## Completion Checklist

- `js/config/supabase.js` contains only the Project URL and anon public key.
- Signup uses Supabase when keys are configured.
- Login uses Supabase when keys are configured.
- Logout clears the Supabase session.
- Refreshing the dashboard preserves the session.
- Password reset calls Supabase recovery in Supabase mode.
- New Auth users automatically receive a profile.
- New Auth users automatically receive a demo wallet.
- New public signups are assigned `customer`, not `admin`.
- Trusted role changes are documented and auditable.
- Local demo auth still works when Supabase keys are placeholders.
