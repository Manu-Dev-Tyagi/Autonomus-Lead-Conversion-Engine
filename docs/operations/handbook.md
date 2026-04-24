# Operations Handbook (Baseline)

## Daily Checks
- Queue depth and overflow incidents
- Lifecycle success/failure rate by tenant
- LLM budget guardrail violations
- Pending approval queue age

## Incident Severity
- **SEV-1:** cross-tenant data leak, sustained outage, critical auth failure
- **SEV-2:** major degradation (high latency/failure rates)
- **SEV-3:** isolated tenant impact or partial feature issues

## First 15 Minutes
1. Acknowledge incident and assign incident commander.
2. Capture blast radius (tenants, workflows, endpoints).
3. Apply containment (feature flag off, canary halt, rollback if needed).
4. Start timeline log with UTC timestamps.

## Recovery Verification
- SLO metrics return to normal bands.
- No queue overflow growth.
- No new DLQ spikes.
- No unresolved high-priority approval backlog.

## Postmortem
- Root cause
- Detection and response gaps
- Corrective actions with owners and due dates
