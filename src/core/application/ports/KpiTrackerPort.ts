export interface KpiTrackerPort {
  increment(input: { tenantId: string; metric: string; value?: number }): Promise<void>;
}
