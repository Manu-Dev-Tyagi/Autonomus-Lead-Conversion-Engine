import {
  TenantOpsMetrics,
  TenantOpsMetricsPort,
} from "@/src/core/application/ports/TenantOpsMetricsPort";

export class InMemoryTenantOpsMetricsAdapter implements TenantOpsMetricsPort {
  private readonly map = new Map<string, TenantOpsMetrics>();

  async incrementSuccess(tenantId: string): Promise<void> {
    const current = this.map.get(tenantId) ?? {
      tenantId,
      successCount: 0,
      failureCount: 0,
    };
    this.map.set(tenantId, {
      ...current,
      successCount: current.successCount + 1,
    });
  }

  async incrementFailure(tenantId: string): Promise<void> {
    const current = this.map.get(tenantId) ?? {
      tenantId,
      successCount: 0,
      failureCount: 0,
    };
    this.map.set(tenantId, {
      ...current,
      failureCount: current.failureCount + 1,
    });
  }

  async getByTenant(tenantId: string): Promise<TenantOpsMetrics> {
    return (
      this.map.get(tenantId) ?? {
        tenantId,
        successCount: 0,
        failureCount: 0,
      }
    );
  }
}
