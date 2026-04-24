# Runbook: Failed Lifecycle Recovery (DLQ)

## Purpose
Recover lead lifecycle jobs that fail during enrichment or scoring and are routed to dead letter queue (DLQ).

## Trigger Conditions
- `agent_stage_failed` error logs present.
- DLQ entry created with `stage` and `reason`.
- Lead remains in partial transition without completion metric.

## Recovery Steps
1. Identify DLQ item by `tenantId`, `leadId`, and `idempotencyKey`.
2. Inspect failure reason (provider timeout, quota, malformed payload).
3. Validate lead current state and score consistency in source of truth.
4. Fix root cause:
   - provider outage -> wait or failover,
   - payload issue -> patch input mapping,
   - auth issue -> rotate credentials.
5. Replay command using same `idempotencyKey` only if previous run did not complete.
6. Confirm success metrics and read model update.

## Safety Checks
- Never bypass idempotency on replay.
- Never force state transition outside domain rules.
- Preserve audit trail for all replay attempts.

## Escalation
- If same lead fails 3 times in 30 minutes, escalate to incident channel and pause automated retries for affected tenant.
