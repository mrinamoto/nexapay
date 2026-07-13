# NexaPay Architecture

NexaPay is intentionally simple for beginners. The frontend is static HTML/CSS/JavaScript, and the backend design uses Supabase Auth plus PostgreSQL.

## Folder Structure

```text
nexapay/
  index.html
  login.html
  signup.html
  pages/
    customer/
    merchant/
    agent/
    admin/
  assets/
    images/
    icons/
    logos/
  css/
  js/
    auth/
    components/
    config/
    pages/
    services/
    utils/
  supabase/
    migrations/
    policies/
    seed.sql
  docs/
```

## Runtime Flow

1. A page loads one small HTML file.
2. The page sets `window.NEXAPAY_PAGE`.
3. `js/pages/app.js` renders the correct screen.
4. Local demo mode reads and writes fictional data in `localStorage`.
5. Supabase mode can use the public URL and anon key in `js/config/supabase.js`.

## Roles

- Customer: wallet actions, requests, payments, savings, profile, receipts.
- Merchant: protected dashboard, demo balance, payment statistics, searchable payment history, QR identifier, receipts, and business profile.
- Agent: protected dashboard, demo balance, customer search, cash-in, cash-out, daily stats, searchable history, receipts, and audit records.
- Admin: overview analytics, user account status, merchants, agents, service content, announcements, promotions, transactions, audit logs, and system settings.

## Transaction Rule

The frontend may collect form inputs, but the database must own final wallet changes. In Supabase, balance changes should go through RPC functions:

- `transfer_demo_money`
- `add_demo_money`
- `cash_out_demo_money`
- `agent_cash_in_demo_money`
- `agent_cash_out_demo_money`
- `service_payment`
- `respond_money_request`
- `move_savings_goal_money`

This prevents direct balance manipulation from JavaScript.

Non-balance helpers such as `search_demo_profiles` and `list_demo_favorites` expose only safe demo directory fields and user-owned favorites.

Merchant dashboard features read the signed-in merchant's wallet, merchant row, and related `merchant_payment` transactions. Merchant profile edits update only safe owner/business fields and do not touch wallet balances or completed transaction history.

Agent dashboard features read the signed-in agent's wallet, agent row, and related cash-in/cash-out transactions. Agent cash-in and agent-initiated cash-out use dedicated RPC functions in Supabase mode so wallet changes, notifications, and audit logs are written atomically.

Admin dashboard features use `js/services/admin-service.js` as a small management layer. In local demo mode it updates fictional browser data. In Supabase mode, sensitive admin actions use database checks and RPC functions:

- `admin_set_profile_status`
- `admin_set_managed_status`
- `admin_save_managed_item`
- `admin_save_promotion`
- `admin_create_announcement`
- `admin_update_system_setting`

Admins can search transactions, but completed transaction history remains view-only in the UI. Content changes, account status changes, announcements, and settings changes write audit records.

Phase 18 hardens the boundary further: the RLS migration is rerunnable, anonymous direct table access is revoked, direct wallet/transaction mutations are blocked, admin content writes use audited RPCs, and private Storage policies are prepared for profile images and merchant logos.
