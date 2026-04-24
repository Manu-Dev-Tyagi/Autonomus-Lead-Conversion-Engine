import { describe, expect, it } from "vitest";

import { InMemoryTenantOpsMetricsAdapter } from "@/src/core/infrastructure/adapters/InMemoryTenantOpsMetricsAdapter";

describe("InMemoryTenantOpsMetricsAdapter", () => {
  it("tracks success and failure counters by tenant", async () => {
    const adapter = new InMemoryTenantOpsMetricsAdapter();
    await adapter.incrementSuccess("tenant-a");
    await adapter.incrementSuccess("tenant-a");
    await adapter.incrementFailure("tenant-a");

    const metrics = await adapter.getByTenant("tenant-a");
    expect(metrics.successCount).toBe(2);
    expect(metrics.failureCount).toBe(1);
  });
});
