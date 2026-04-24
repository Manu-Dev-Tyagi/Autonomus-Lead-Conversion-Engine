import { describe, expect, it, vi } from "vitest";

import { PostgresHistoricalOutcomesReadAdapter } from "@/src/core/infrastructure/adapters/PostgresHistoricalOutcomesReadAdapter";

describe("PostgresHistoricalOutcomesReadAdapter", () => {
  it("computes conversion rate from segment-matched outcomes", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        { type: "converted", metadata: { segmentKey: "saas" } },
        { type: "converted", metadata: { segmentKey: "saas" } },
        { type: "lost", metadata: { segmentKey: "saas" } },
        { type: "converted", metadata: { segmentKey: "fintech" } },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as any;

    const adapter = new PostgresHistoricalOutcomesReadAdapter(client);
    const rate = await adapter.getConversionRate({
      tenantId: "tenant-1",
      segmentKey: "saas",
    });

    expect(rate).toBeCloseTo(2 / 3, 5);
  });

  it("returns null when no segment rows exist", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ type: "converted", metadata: { segmentKey: "fintech" } }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as any;

    const adapter = new PostgresHistoricalOutcomesReadAdapter(client);
    const rate = await adapter.getConversionRate({
      tenantId: "tenant-1",
      segmentKey: "saas",
    });

    expect(rate).toBeNull();
  });
});
