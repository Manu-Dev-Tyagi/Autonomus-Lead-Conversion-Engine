# Disaster Recovery and Data Retention

## RTO / RPO Targets
- **RTO:** 60 minutes
- **RPO:** 15 minutes

## Recovery Drills
- Frequency: monthly staging simulation, quarterly production game day.
- Scenarios:
  - database outage
  - queue backlog/consumer failure
  - LLM provider outage
  - accidental bad rollout

## Backup and Retention
- Daily full backups + 15-minute incremental snapshots for primary data.
- Retain backups 35 days hot, 180 days cold.
- Audit logs retained minimum 365 days.

## Drill Checklist
- [ ] Restore DB snapshot to target time.
- [ ] Replay queued events from checkpoint.
- [ ] Validate tenant isolation policies post-restore.
- [ ] Validate SLO metrics recovery within RTO.
- [ ] Document findings and remediation actions.
