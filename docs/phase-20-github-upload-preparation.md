# Phase 20 - GitHub Upload Preparation

## What We Built

Phase 20 prepares NexaPay for a public GitHub repository.

This phase adds stronger ignore rules, a safer environment template, Git line-ending metadata, a security policy, README updates, and a beginner-friendly upload checklist.

## Why It Is Needed

GitHub is public by default for portfolio projects. Before uploading, the project must avoid secrets, temporary files, local environment files, and confusing setup gaps.

The goal is to make NexaPay easy for visitors to understand, run, test, and verify without exposing private credentials.

## Files Added

```text
.gitattributes
SECURITY.md
docs/phase-20-github-upload-preparation.md
```

## Files Updated

```text
.gitignore
.env.example
README.md
docs/beginner-phase-guide.md
```

## Secret Safety Rules

Before every GitHub upload, confirm:

- `.env` is not committed.
- `.env.local` is not committed.
- Supabase service-role keys are not committed.
- Database passwords are not committed.
- Real API keys are not committed.
- No real customer data is included.
- Demo test passwords are clearly fictional.
- `js/config/supabase.js` contains only placeholders or a public Supabase anon key.

## Secret Scan Command

Run this from the NexaPay folder:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' "service[_-]?role|SUPABASE_SERVICE|DATABASE_URL|postgres://|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY|REAL_PAYMENT_GATEWAY_SECRET"
```

Expected output:

```text
Only documentation warnings and placeholder examples should appear.
```

If a real secret appears, remove it before running `git add`.

## Final Test Command

Run all tests before committing:

```powershell
Get-ChildItem -Path js -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tests -Filter *.mjs | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tools -Filter *.mjs | ForEach-Object { node --check $_.FullName }
Get-ChildItem -Path tests -Filter phase*.mjs | Sort-Object Name | ForEach-Object { node $_.FullName }
```

Expected output:

```text
Phase 10 through Phase 21 tests print passed messages.
```

## Manual Preview Command

```powershell
node tools\local-preview-server.mjs . 5173
```

Open:

```text
http://127.0.0.1:5173
```

Expected output:

```text
The NexaPay demo opens and shows the educational disclaimer.
```

## Upload To A New GitHub Repository

Use these commands after creating an empty repository on GitHub.

Replace:

```text
YOUR-USERNAME
```

with your GitHub username.

Replace:

```text
nexapay
```

with your repository name if you choose a different one.

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

Expected output:

```text
Git creates the main branch, commits the project, and pushes it to GitHub.
```

## Update An Existing GitHub Repository

Use this when the repository already exists and `origin` is already connected:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
git status
git add .
git status
git commit -m "Complete Phase 20 GitHub upload preparation"
git pull --rebase origin main
git push origin main
```

Expected output:

```text
Git commits the latest changes and updates the GitHub repository.
```

If Git says there is nothing to commit, the local files already match the latest commit.

## Common Errors And Fixes

Problem: `git is not recognized`

Fix: Install Git for Windows from `https://git-scm.com/download/win`, then close and reopen PowerShell.

Problem: `remote origin already exists`

Fix: Check the current remote:

```powershell
git remote -v
```

If it points to the wrong repository:

```powershell
git remote set-url origin https://github.com/YOUR-USERNAME/nexapay.git
```

Problem: `rejected because the remote contains work that you do not have locally`

Fix:

```powershell
git pull --rebase origin main
git push origin main
```

Problem: You accidentally staged `.env`

Fix:

```powershell
git restore --staged .env
```

Then confirm `.env` is ignored:

```powershell
git status --ignored
```

Problem: GitHub Pages shows a blank page.

Fix: Confirm the repository is serving from the root folder and that `index.html` is in the repository root.

## GitHub Pages Setup

1. Open the repository on GitHub.
2. Click **Settings**.
3. Click **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch **main**.
6. Choose folder **/** root.
7. Click **Save**.
8. Wait for GitHub to show the public Pages URL.

## Completion Checklist

- `.gitignore` protects local secrets and generated files.
- `.env.example` contains placeholders only.
- `SECURITY.md` explains the safe demo boundary.
- `LICENSE` exists.
- README has setup, testing, Supabase, deployment, and disclaimer sections.
- Phase 20 guide exists.
- Secret scan shows no real credentials.
- Syntax checks pass.
- Phase 10 through Phase 21 tests pass.
- Manual preview server returns the app.
- Git commands are ready for upload.
