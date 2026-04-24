# Security Hardening Baseline

## Secrets Rotation
- Rotate `SUPABASE_SERVICE_ROLE_KEY` every 30 days or immediately on suspicion.
- Rotate `GEMINI_API_KEY` every 30 days or on anomaly detection.
- Keep secrets out of client-side env prefixes and never log secret values.

## Least Privilege
- Use publishable key only in browser-facing clients.
- Use service-role key only in server actions/routes.
- Restrict tenant-sensitive reads to RLS-protected policies.

## Audit Logging
- Record all privileged actions (tenant claim updates, policy overrides, admin actions).
- Persist to `public.audit_logs` with actor, tenant, entity, action, metadata.
- Keep immutable write path for incident investigations.

## Runtime Controls
- Enforce LLM prompt/token/cost budgets before provider call.
- Enforce queue max-depth and fail fast on overflow.
- Require confidence gate + human approval for high-risk autonomous actions.

## Security Review Checklist (Release Gate)
- [ ] Secret rotation evidence attached.
- [ ] Service-role usage reviewed and server-only.
- [ ] RLS policy checks validated for tenant data paths.
- [ ] Audit log records visible for privileged operations.
- [ ] High-risk actions gated by policy and approval hooks.
