# Phase 21 - Free Deployment

## What We Built

Phase 21 prepares NexaPay for a free static deployment.

The easiest suitable free platform for the first public demo is **GitHub Pages** because NexaPay is a static HTML, CSS, and vanilla JavaScript project. No build step, server, Docker container, or paid service is required.

Cloudflare Pages is also supported as an alternative.

## Why It Is Needed

A portfolio project is stronger when someone can open a public URL and try it.

This phase adds deployment-ready static files, production Supabase setup instructions, redirect URLs, troubleshooting notes, and a repeatable deployment-readiness test.

## Files Added

```text
.nojekyll
404.html
docs/phase-21-free-deployment.md
tests/phase21-deployment-prep.mjs
```

## Files Updated

```text
.env.example
README.md
docs/beginner-phase-guide.md
tests/phase19-regression.mjs
```

## Recommended Free Platform

Use GitHub Pages first.

Why:

- Free for public repositories.
- Perfect for static HTML/CSS/JS.
- No build command needed.
- Works with the existing folder structure.
- Easy to update with `git push`.

## Deployment URLs

For a repository named `nexapay`, your GitHub Pages URL usually looks like this:

```text
https://YOUR-USERNAME.github.io/nexapay/
```

Replace:

```text
YOUR-USERNAME
```

with your GitHub username.

## Configure Supabase For Production

Only do this if you want Supabase Auth and database mode to work on the deployed site. Local demo role buttons work without Supabase.

### Step 1 - Run Database SQL

Open Supabase:

1. Open `https://supabase.com`.
2. Open your NexaPay project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Run these files in order:

```text
supabase/migrations/001_schema.sql
supabase/seed.sql
supabase/migrations/004_auth_integration.sql
supabase/migrations/002_rpc_functions.sql
supabase/migrations/003_rls_policies.sql
```

Expected result:

```text
Tables, seed data, Auth trigger, RPC functions, and RLS policies are installed.
```

### Step 2 - Set Auth URLs

In Supabase:

1. Click **Authentication**.
2. Click **URL Configuration**.
3. Set **Site URL** to:

```text
https://YOUR-USERNAME.github.io/nexapay/
```

4. Add these **Redirect URLs**:

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

5. Click **Save**.

Expected result:

```text
Supabase password recovery and session redirects can return to the deployed NexaPay pages.
```

### Step 3 - Add Public Supabase Keys

In Supabase:

1. Click **Project Settings**.
2. Click **API**.
3. Copy **Project URL**.
4. Copy **anon public** key.
5. Open:

```text
js/config/supabase.js
```

6. Replace:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```

with your real public values.

Important:

```text
Do not paste the service-role key.
Do not paste a database password.
Do not paste a payment gateway key.
```

The Supabase anon key is public by design, but it is only safe when RLS is enabled and policies are correct.

## GitHub Pages Deployment

### Step 1 - Push To GitHub

If this is a new repository:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
git init
git branch -M main
git add .
git commit -m "Deploy NexaPay educational simulator"
git remote add origin https://github.com/YOUR-USERNAME/nexapay.git
git push -u origin main
```

If the repository already exists:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
git status
git add .
git commit -m "Prepare Phase 21 free deployment"
git pull --rebase origin main
git push origin main
```

### Step 2 - Enable GitHub Pages

1. Open your repository on GitHub.
2. Click **Settings**.
3. Click **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Set **Branch** to `main`.
6. Set **Folder** to `/ (root)`.
7. Click **Save**.
8. Wait until GitHub shows the deployment URL.

Expected URL:

```text
https://YOUR-USERNAME.github.io/nexapay/
```

## Cloudflare Pages Alternative

Use this if you prefer Cloudflare Pages.

1. Push the project to GitHub.
2. Open Cloudflare Dashboard.
3. Click **Workers & Pages**.
4. Click **Create application**.
5. Choose **Pages**.
6. Connect your GitHub repository.
7. Set **Framework preset** to `None`.
8. Leave **Build command** blank.
9. Set **Build output directory** to:

```text
/
```

10. Click **Save and Deploy**.

Cloudflare URL example:

```text
https://nexapay.pages.dev/
```

If using Cloudflare, add these Supabase Redirect URLs too:

```text
https://nexapay.pages.dev/
https://nexapay.pages.dev/login.html
https://nexapay.pages.dev/reset-password.html
```

## Deployment Readiness Test

Run this before pushing:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
node tests\phase21-deployment-prep.mjs
```

Expected output:

```text
Phase 21 deployment test passed: static hosting files, deployment docs, Supabase production guidance, and GitHub Pages readiness are correct.
```

Run the full test suite:

```powershell
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

Expected output:

```text
Phase 10 through Phase 21 tests print passed messages.
```

## Troubleshooting

Problem: GitHub Pages shows a 404.

Fix:

- Confirm `index.html` is in the repository root.
- Confirm GitHub Pages is set to branch `main` and folder `/ (root)`.
- Wait a few minutes and refresh.

Problem: CSS or JavaScript does not load.

Fix:

- Confirm `.nojekyll` exists.
- Confirm the repository contains `css`, `js`, `assets`, and `pages`.
- Open browser developer tools and look for missing file paths.

Problem: Login works locally but not on GitHub Pages.

Fix:

- Open Supabase **Authentication > URL Configuration**.
- Confirm the GitHub Pages URL is set as **Site URL**.
- Confirm `reset-password.html` is in **Redirect URLs**.

Problem: Password reset opens the wrong site.

Fix:

- Update Supabase **Site URL** to the deployed URL.
- Add the deployed reset URL:

```text
https://YOUR-USERNAME.github.io/nexapay/reset-password.html
```

Problem: Supabase requests fail with permission errors.

Fix:

- Rerun `supabase/migrations/003_rls_policies.sql`.
- Confirm you are signed in.
- Confirm the user has the correct role in `profiles`.

Problem: You accidentally deployed a service-role key.

Fix:

1. Remove it from the code immediately.
2. Rotate the key in Supabase.
3. Commit and push the cleaned file.
4. Review Git history before keeping the repository public.

## Completion Checklist

- GitHub Pages marker `.nojekyll` exists.
- Static `404.html` exists.
- `index.html` is in the deploy root.
- All CSS, JS, assets, and pages are relative-path friendly.
- Supabase Site URL is set to the deployed URL.
- Supabase Redirect URLs include local and deployed reset-password pages.
- `js/config/supabase.js` uses only the public anon key.
- No service-role key is in frontend code.
- Phase 10 through Phase 21 tests pass.
- Public site displays the educational demo disclaimer.
