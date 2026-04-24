# Partition Strategy (Postgres / Supabase)

## Why
Tenant-heavy event tables grow quickly and can degrade scans, vacuum, and retention jobs over time.

## Partition Candidates
- `public.interactions` (high write velocity)
- `public.audit_logs` (append-only security stream)

## Trigger Thresholds
- Interactions > 10M rows or monthly growth > 2M rows.
- Audit logs > 20M rows or retention queries exceed p95 500ms.

## Partition Plan
1. Convert to monthly range partitioning on `created_at`.
2. Keep child indexes aligned with hottest query patterns:
   - `(tenant_id, lead_id, created_at desc)`
   - `(tenant_id, outcome, created_at desc)`
3. Add automated partition creation one month ahead.
4. Archive/drop old partitions based on retention policy.

## Rollout Steps
1. Create partitioned shadow table and indexes.
2. Backfill historical data in batches.
3. Swap writes using transaction-safe migration window.
4. Validate row counts, index usage, and latency.

## Validation
- Query plans use partition pruning.
- p95 tenant timeline queries improve/stay stable.
- Backup/restore drills succeed with partitioned tables.
