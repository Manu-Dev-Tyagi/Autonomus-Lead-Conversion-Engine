# Release Strategy: Canary and Rollback

## Canary Rollout
- Deploy new version to 5% tenant cohort.
- Monitor SLOs:
  - orchestration success rate
  - p95 latency
  - queue overflow events
  - LLM budget violations
- Promote to 25% then 100% only if all thresholds hold.

## Feature Flags
- Gate risky features behind server-evaluated flags:
  - autonomous booking
  - LLM-generated messaging
  - high-risk action auto-execution

## Rollback Conditions
- Success rate drops below warning threshold for 15 minutes.
- Any critical security event (cross-tenant access, secret leak signal).
- Queue overflow sustained for 5+ minutes.

## Rollback Procedure
1. Disable affected feature flags immediately.
2. Roll back deployment to last stable version.
3. Drain queue and isolate failed job classes.
4. Post-incident review with root cause and action items.
