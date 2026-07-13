# NexaPay Supabase Setup

Run SQL in this order:

1. `migrations/001_schema.sql`
2. `seed.sql`
3. `migrations/004_auth_integration.sql`
4. `migrations/002_rpc_functions.sql`
5. `migrations/003_rls_policies.sql`

`002_rpc_functions.sql` contains secure demo transfer, merchant search, QR lookup, registered-agent search, Add Money, Cash Out, agent cash-in/cash-out, service-payment, request-money, profile search, favorite-list, and audited admin-management RPC functions.

For Phase 11, rerun `seed.sql` and then rerun `migrations/002_rpc_functions.sql` so the newest fictional bill providers and hardened `service_payment` validation are installed.

For Phase 12, rerun `migrations/002_rpc_functions.sql` and `migrations/003_rls_policies.sql` so savings goals use RPC-protected deposits/withdrawals and donation payments validate fictional organizations.

For Phase 14, rerun `migrations/002_rpc_functions.sql` so `list_demo_favorites()` is installed. Confirm `migrations/003_rls_policies.sql` has already been run so notifications and favorites stay user-owned.

For Phase 15, no new migration is required. Confirm `migrations/003_rls_policies.sql` has been run so merchant owners can read/update their own merchant profile while normal users remain blocked.

For Phase 16, rerun `migrations/002_rpc_functions.sql` so `agent_cash_in_demo_money()` and `agent_cash_out_demo_money()` are installed with authenticated execute permissions.

For Phase 17, rerun `migrations/002_rpc_functions.sql` so `admin_set_profile_status()`, `admin_set_managed_status()`, `admin_create_announcement()`, and `admin_update_system_setting()` are installed. Confirm `migrations/003_rls_policies.sql` has already been run so admin reads and content management are enforced by database role checks.

For Phase 18, rerun `migrations/002_rpc_functions.sql` and then rerun `migrations/003_rls_policies.sql`. Phase 18 adds audited admin save RPCs, removes broad direct admin write policies, blocks direct wallet/transaction edits through RLS, and creates private Storage buckets for `profile-images` and `merchant-logos`.

Optional after creating demo Auth users:

6. `demo-seed-after-auth.sql`

Do not commit Supabase service-role keys, database passwords, or real user credentials.
