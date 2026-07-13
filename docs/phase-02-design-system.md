# Phase 2 - Folder Structure And Design System

This phase builds the reusable foundation for the NexaPay interface. Phase 1 branding stays unchanged.

## What We Built

- A scalable folder structure for public, customer, merchant, agent, admin, assets, CSS, JavaScript, Supabase, and docs.
- CSS design tokens for colors, typography, spacing, radius, shadows, motion, layout, and themes.
- Reusable components for buttons, icon buttons, cards, forms, notices, badges, lists, grids, progress bars, skeleton loading states, receipts, and bottom navigation.
- Responsive rules for desktop, tablet, and mobile layouts.
- Dark/light theme foundations with persisted user preference.

## Why It Is Needed

The design system prevents every page from inventing its own styles. When you need to change NexaPay spacing, color, radius, or typography, you update the shared CSS tokens instead of editing every page.

## Folder Structure For This Phase

```text
nexapay/
  assets/
    images/
    icons/
    logos/
  css/
    variables.css
    reset.css
    global.css
    components.css
    auth.css
    dashboard.css
    transaction.css
    admin.css
    responsive.css
  js/
    auth/
    components/
    config/
    pages/
    services/
    utils/
  pages/
    customer/
    merchant/
    agent/
    admin/
  docs/
    phase-02-design-system.md
```

## Files To Know

`css/variables.css`

Stores design tokens:

- Brand colors
- Semantic colors
- Dark theme overrides
- Font scale
- Spacing scale
- Border radius
- Shadows
- Motion timing
- Layout widths

`css/global.css`

Stores app-wide layout and base styles:

- Page background
- Mobile shell
- Screen headers
- Brand row
- Empty, error, and success states
- Print styles
- Utility text classes

`css/components.css`

Stores reusable interface pieces:

- `.button`
- `.icon-button`
- `.card`
- `.field`
- `.input`
- `.notice`
- `.badge`
- `.list-item`
- `.bottom-nav`
- `.progress`
- `.skeleton`

`css/responsive.css`

Stores responsive behavior:

- Desktop centered mobile shell
- Full-width mobile layout
- Admin dashboard collapse
- Grid collapse
- Reduced-motion support

`js/pages/app.js`

Stores shared rendering helpers and now controls the dark/light theme:

- Reads saved theme from `localStorage`
- Falls back to device color preference
- Applies `data-theme="dark"` to the page
- Updates the profile theme button label

## Exact Windows 11 Commands

From the project folder:

```powershell
cd C:\Users\User\Documents\Codex\2026-07-08\act-as-a-senior-full-stack-2\outputs\nexapay
```

Start the local server:

```powershell
py -m http.server 5173
```

Open this URL:

```text
http://127.0.0.1:5173/
```

Run JavaScript syntax checks:

```powershell
node --check js\pages\app.js
node --check js\services\wallet-service.js
node --check js\auth\auth-service.js
```

## How To Test Phase 2

1. Open `http://127.0.0.1:5173/`.
2. Click **Customer demo**.
3. Open **Profile**.
4. Click the theme button.
5. Refresh the page.
6. Confirm the same theme remains active.
7. Resize the browser below mobile width.
8. Confirm the mobile shell becomes full width.
9. Open Admin demo.
10. Confirm the admin sidebar collapses on small screens.

## Expected Output

- NexaPay pages use consistent colors, buttons, cards, forms, and spacing.
- Dark mode changes the whole interface, not only one page.
- The selected theme persists after refresh.
- Mobile screens do not overflow horizontally.
- Admin pages remain readable on desktop and mobile.

## Common Errors And Solutions

`Styles do not change`

Make sure each HTML file links the CSS files in this order:

```html
variables.css
reset.css
global.css
components.css
auth.css
dashboard.css
transaction.css
admin.css
responsive.css
```

`Theme resets after refresh`

Check that the browser allows local storage. The demo saves the theme under `nexapay.theme`.

`Page looks broken when opened directly from the file system`

Use the local server command. ES module imports work best through `http://127.0.0.1:5173/`.

`Text is hard to read in dark mode`

Use semantic tokens such as `--color-ink`, `--color-muted`, `--color-panel`, and `--color-line` instead of hard-coded colors.

## Completion Checklist

- [x] Folder structure is organized and scalable.
- [x] CSS variables cover color, spacing, typography, radius, shadows, motion, and layout.
- [x] Reusable buttons, cards, forms, lists, badges, notices, and navigation components exist.
- [x] Responsive rules support mobile and desktop.
- [x] Dark/light theme foundations exist.
- [x] Theme preference persists with local storage.
- [x] Phase 1 branding was not rebuilt.
