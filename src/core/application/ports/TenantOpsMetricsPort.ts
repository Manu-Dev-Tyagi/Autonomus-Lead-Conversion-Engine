export interface TenantOpsMetrics {
  readonly tenantId: string;
  readonly successCount: number;
  readonly failureCount: number;
}

export interface TenantOpsMetricsPort {
  incrementSuccess(tenantId: string): Promise<void>;
  incrementFailure(tenantId: string): Promise<void>;
  getByTenant(tenantId: string): Promise<TenantOpsMetrics>;
}
