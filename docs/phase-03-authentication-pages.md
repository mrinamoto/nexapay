# Phase 3 - Authentication Pages

This phase creates professional responsive authentication pages using **demo frontend behavior only**. Supabase Auth integration comes later.

## What We Built

- Login page
- Signup page
- Forgot password page
- Reset password page
- Demo role quick-login buttons
- Local demo signup with hashed password storage in the browser
- Local demo password reset for accounts created through the signup page
- Password visibility toggles
- Password strength meters
- Clear educational safety notices

## Why It Is Needed

Authentication is the doorway into role-based wallet features. In this phase, the goal is to learn the UI and frontend state flow before connecting Supabase.

The pages do not send real emails, OTPs, SMS messages, or password reset links.

## Files Created Or Updated

```text
nexapay/
  login.html
  signup.html
  forgot-password.html
  reset-password.html
  css/
    auth.css
  js/
    auth/
      auth-service.js
    pages/
      app.js
  docs/
    phase-03-authentication-pages.md
```

## Exact File Responsibilities

`login.html`

Loads the shared app script and displays the login screen.

`signup.html`

Loads the shared app script and displays the local demo registration screen.

`forgot-password.html`

Starts the simulated password reset flow. No email is sent.

`reset-password.html`

Lets a user set a new password for a local demo account created in this browser.

`js/auth/auth-service.js`

Handles local demo auth behavior:

- Create demo account
- Hash demo password with SHA-256
- Save local browser session
- Sign in
- Sign out
- Prepare demo reset
- Reset demo password

`js/pages/app.js`

Renders the auth screens and wires form events.

`css/auth.css`

Styles the responsive auth cards, forms, password fields, role cards, and password strength meters.

## Windows 11 Commands

Open PowerShell in the project folder:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
```

Start a local server:

```powershell
py -m http.server 5173
```

Open:

```text
http://127.0.0.1:5173/login.html
```

Run syntax checks:

```powershell
node --check js\pages\app.js
node --check js\auth\auth-service.js
```

## How To Test

### Test Login With Demo Role

1. Open `login.html`.
2. Click **Customer** under role choices.
3. Expected output: Customer dashboard opens.

### Test Signup

1. Open `signup.html`.
2. Enter a fictional name.
3. Enter a demo email such as `learner@example.test`.
4. Enter a demo phone number such as `01710000055`.
5. Enter a password with at least 8 characters, letters, and numbers.
6. Check the educational demo consent box.
7. Click **Create demo account**.
8. Expected output: Customer dashboard opens with a demo wallet.

### Test Login With Created Account

1. Open `login.html`.
2. Enter the email and password created during signup.
3. Click **Log in to demo**.
4. Expected output: Customer dashboard opens.

### Test Forgot And Reset Password

1. Open `forgot-password.html`.
2. Enter the email from your local signup.
3. Click **Continue to demo reset**.
4. Click **Open reset page**.
5. Enter a new demo password.
6. Click **Save demo password**.
7. Open `login.html`.
8. Log in using the new password.

## Expected Output

- Auth pages are centered, responsive, and visually consistent with NexaPay.
- Password fields can be shown or hidden.
- Signup and reset pages show password strength feedback.
- Demo role buttons open role dashboards.
- Forgot/reset flow stays entirely inside the browser.
- Safety messages clearly say no real OTP, email, bank, or financial credential is used.

## Common Errors And Solutions

`Use a demo role button, or sign up to create a local demo login.`

This means the email was not created through the signup page in this browser. Use a demo role button or create a new local demo account.

`Use at least one letter and one number in this demo password.`

Update the password so it includes both letters and numbers.

`Page does not load correctly when opened directly`

Use the local server command instead of opening the HTML file directly.

`Reset password says success but old seeded account still does not log in`

Seeded role accounts are intended for role buttons. The password reset flow is for accounts created through the signup page.

## Completion Checklist

- [x] Login page exists and works with local demo accounts.
- [x] Signup page creates a local demo profile and wallet.
- [x] Forgot password page is demo-only and sends no email.
- [x] Reset password page is separate from forgot password.
- [x] Password toggles and strength meters work.
- [x] Demo role buttons work.
- [x] Supabase Auth is not required in Phase 3.
