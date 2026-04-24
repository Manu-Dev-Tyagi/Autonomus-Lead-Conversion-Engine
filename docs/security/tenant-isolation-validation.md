# Tenant Isolation Validation Plan

## Goal
Validate that tenant A cannot access or mutate tenant B data across APIs, orchestration, and admin paths.

## Test Scenarios

1. **RLS Read Isolation**
- Login as tenant A user.
- Query `leads`, `todos`, `audit_logs`.
- Confirm no rows from tenant B.

2. **RLS Write Isolation**
- Attempt insert/update with foreign `tenant_id`.
- Confirm request denied or no-op by policy.

3. **Admin Claim Abuse Test**
- Non-admin user attempts `/admin/tenant-claims`.
- Confirm forbidden path and no metadata update.

4. **Cross-Tenant Orchestration Replay**
- Replay idempotency key from another tenant context.
- Confirm no cross-tenant lead state mutation.

5. **Audit Log Segregation**
- Verify tenant admin only sees same-tenant audit logs.

## Acceptance
- Zero successful cross-tenant reads/writes.
- All failures captured with audit or app logs.
