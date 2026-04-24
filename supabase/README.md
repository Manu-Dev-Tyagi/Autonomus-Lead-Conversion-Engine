# Supabase Setup (ALE Runtime)

## What this setup does
- Creates tenant-aware runtime tables (`tenants`, `tenant_memberships`, `leads`, `interactions`, `agent_decisions`, `idempotency_keys`, `pipeline_read_models`, `tenant_ops_metrics`, `audit_logs`, `todos`)
- Uses UUID keys and enum roles
- Enables strict RLS for authenticated tenant members/admins only
- Reads active tenant from JWT `app_metadata.tenant_id`

## Apply SQL (recommended order)
1. Open Supabase Dashboard -> SQL Editor.
2. Run `supabase/production_baseline.sql` (main schema + RLS).
3. Run `supabase/performance_tuning.sql` (index tuning package).
4. (Optional) Run `supabase/seed_dev.sql` after replacing placeholder UUIDs.

Legacy files still available:
- `supabase/ale_foundation.sql` (foundation subset)
- `supabase/audit_logs.sql` (already included in production baseline)

## Required Auth Claim
RLS expects `app_metadata.tenant_id` in the authenticated user's JWT.

Do not use `user_metadata` for authorization.

## App behavior
- Unauthenticated users: page shows sign-in prompt.
- Authenticated users with matching membership + tenant claim: page reads `todos`.
- Runtime repository paths depend on `public.leads`, included in `production_baseline.sql`.

## Auth flow added in app
- `/auth/sign-in`: email magic-link login.
- `/auth/callback`: exchanges auth code for a server session.
- `/`: shows active tenant claim + form to set `app_metadata.tenant_id`.

To enable secure claim updates, set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
This key must stay server-only and never use `NEXT_PUBLIC_`.

## Verification checks after SQL apply
- Confirm tables exist: `leads`, `interactions`, `agent_decisions`, `idempotency_keys`, `audit_logs`.
- Confirm RLS enabled on tenant data tables.
- Confirm tenant-scoped reads only return rows for `app_metadata.tenant_id`.

## Next steps
- Add migration automation (`supabase migration new ...`) for tracked promotion across environments.
- Add data-retention jobs for interactions/audit partitions once volume threshold is reached.
