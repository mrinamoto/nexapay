# Security Policy

NexaPay is an educational financial-service simulator. It does not process real money and must not be connected to real banks, payment gateways, telecom services, or bill-payment providers.

## Safe Configuration

- Use only the Supabase public anon key in frontend code.
- Never commit a Supabase service-role key.
- Never commit database passwords or connection strings.
- Never collect real card numbers, CVV, OTP codes, bank passwords, national ID data, or financial PINs.
- Keep all wallet-balance changes behind Supabase RPC functions.
- Rerun `supabase/migrations/003_rls_policies.sql` after schema or policy changes.

## Reporting Issues

If you find a security issue in your own fork, fix it privately before publishing. If you publish NexaPay as a portfolio project, add your own contact method here so visitors know how to report issues.

## Demo Boundary

Every public demo should clearly show:

```text
Educational Demo - No Real Money or Financial Transactions
```
