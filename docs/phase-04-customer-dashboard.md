# Phase 4 - Customer Dashboard UI

This phase builds the customer home dashboard using temporary demo data. Supabase integration still comes later.

## What We Built

- Customer greeting area
- Demo balance card
- Hide/show balance behavior
- Money in and money out summary
- Unread notification count
- Priority quick actions
- Full service action grid
- Promotional banners
- Favorite contacts
- Notification preview
- Recommended services
- Recent transactions
- Mobile-first bottom navigation emphasis

## Why It Is Needed

The dashboard is the main screen customers see after login. It should help users understand their demo balance, start common wallet flows quickly, and review recent activity without feeling crowded.

## Files Updated

```text
nexapay/
  css/
    dashboard.css
    components.css
    responsive.css
  js/
    pages/
      app.js
    services/
      demo-data.js
  docs/
    phase-04-customer-dashboard.md
```

## Temporary Demo Data

The dashboard currently uses browser demo data from `js/services/demo-data.js`.

Temporary data includes:

- Fictional customers
- Fictional merchants
- Demo wallet balances
- Recent demo transactions
- Favorite contacts
- Promotional banners
- Notifications
- Savings goal progress

No real financial services are connected.

## Windows 11 Commands

Open PowerShell:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
```

Start the local server:

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
node --check js\services\demo-data.js
```

## How To Test

1. Open `login.html`.
2. Click **Customer** demo.
3. Confirm the customer dashboard opens.
4. Check that the demo balance appears.
5. Click the eye button on the balance card.
6. Confirm the main balance and summary amounts hide.
7. Click the eye button again.
8. Confirm the values reappear.
9. Click quick actions such as **Send Money**, **Scan QR**, and **Pay Bill**.
10. Return to the dashboard and review favorites, promotions, notifications, and recent transactions.
11. Resize the browser to a narrow mobile width.
12. Confirm the dashboard stacks cleanly without horizontal overflow.

## Expected Output

- Dashboard shows a greeting and unread notification count.
- Demo Balance card is prominent.
- Priority actions are easy to tap.
- Services appear in a compact action grid.
- Favorites show fictional demo contacts.
- Promotions and recommended services are visible.
- Recent transactions show temporary demo activity.
- Bottom navigation remains visible and mobile-first.

## Common Errors And Solutions

`Dashboard still shows old data`

Your browser may already have local demo data. Use the Admin demo settings to reset local demo data, or clear site storage for `127.0.0.1`.

`Icons or layout look unstyled`

Confirm all CSS files are linked in `dashboard.html`, especially `dashboard.css`, `components.css`, and `responsive.css`.

`Page does not load with a double-click`

Use the local server command. The app uses JavaScript modules, which should be served through `http://127.0.0.1:5173/`.

## Completion Checklist

- [x] Demo balance card exists.
- [x] Quick actions exist.
- [x] Recent transactions exist.
- [x] Favorite contacts exist.
- [x] Promotions exist.
- [x] Notifications preview exists.
- [x] Recommended services exist.
- [x] Mobile-first navigation remains visible.
- [x] Temporary demo data supports the dashboard.
