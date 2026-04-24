# ALE SLO and Alert Baseline

## Scope
Initial SRE baseline for lifecycle orchestration and queue reliability.

## Service Level Objectives (SLOs)

## 1) Lifecycle Orchestration Success Rate
- **SLI:** successful orchestrations / total orchestrations
- **Target:** >= 99.0% per rolling 30-day window
- **Metric inputs:**
  - `lifecycle_orchestration_completed`
  - `lifecycle_orchestration_failed`

## 2) Lifecycle Orchestration Latency
- **SLI:** p95 latency for orchestration execution
- **Target:** p95 <= 2000 ms (excluding external provider outages)
- **Metric input:**
  - `lifecycle_orchestration_latency_ms`

## 3) Queue Backpressure Health
- **SLI:** queue overflow events / total published events
- **Target:** 0 overflow events under expected load profile
- **Metric input:** adapter error tracking for queue-full guard

## Alert Thresholds (Initial)

- **Critical:** success rate < 97.5% for 10 minutes
- **Warning:** success rate < 99.0% for 30 minutes
- **Critical:** p95 latency > 4000 ms for 10 minutes
- **Warning:** p95 latency > 2000 ms for 30 minutes
- **Critical:** any queue-overflow event in production

## Response Playbook Hooks

- On failure-rate breach: inspect DLQ growth and provider error rates.
- On latency breach: inspect queue depth, retry amplification, and provider tail latencies.
- On queue overflow: reduce ingress concurrency, drain queue, enable tenant throttling.
