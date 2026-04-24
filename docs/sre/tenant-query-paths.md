# Tenant-Heavy Query Paths and Index Map

## Hot Paths

## 1) Lead Pipeline Board
- Filter: `tenant_id`, `state`
- Sort: `score desc`, `created_at desc`
- Index: `idx_leads_tenant_state_score_created`

## 2) Lead Activity Timeline
- Filter: `tenant_id`, `lead_id`
- Sort: `created_at desc`
- Index: `idx_interactions_tenant_lead_created`

## 3) Sequence Performance View
- Filter: `tenant_id`, `sequence_id`, `sequence_step`
- Index: `idx_interactions_tenant_sequence`

## 4) Outcome Funnel
- Filter: `tenant_id`, `outcome`
- Sort: `created_at desc`
- Index: `idx_interactions_tenant_outcome_created`

## 5) Privileged Action Audit Trail
- Filter: `tenant_id`, optional `action`
- Sort: `created_at desc`
- Index: `idx_audit_logs_tenant_action_created`

## Query Hygiene Rules
- Always include `tenant_id` predicate first for multitenant paths.
- Avoid wide `SELECT *` in high-frequency reads.
- Use paginated range scans by `created_at` where possible.
