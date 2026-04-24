-- Performance tuning baseline for tenant-heavy ALE workloads.
-- Apply after base schema setup.

-- Leads: common dashboard and orchestration query patterns.
create index if not exists idx_leads_tenant_state_score_created
  on public.leads (tenant_id, state, score desc, created_at desc);

create index if not exists idx_leads_tenant_updated
  on public.leads (tenant_id, updated_at desc);

-- Interactions: timeline and sequence/outcome drilldowns.
create index if not exists idx_interactions_tenant_lead_created
  on public.interactions (tenant_id, lead_id, created_at desc);

create index if not exists idx_interactions_tenant_sequence
  on public.interactions (tenant_id, sequence_id, sequence_step)
  where sequence_id is not null;

create index if not exists idx_interactions_tenant_outcome_created
  on public.interactions (tenant_id, outcome, created_at desc)
  where outcome is not null;

-- Audit logs: recent privileged actions by tenant/action.
create index if not exists idx_audit_logs_tenant_action_created
  on public.audit_logs (tenant_id, action, created_at desc);

-- Example partition prep (manual migration plan in docs):
-- interactions and audit_logs are prime candidates for monthly range partitions on created_at
-- once row count and retention exceed baseline thresholds.
