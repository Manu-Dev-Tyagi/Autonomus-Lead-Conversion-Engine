import { afterEach, describe, expect, it, vi } from "vitest";

import { ClearbitAdapter } from "@/src/core/infrastructure/adapters/enrichment/ClearbitAdapter";

describe("ClearbitAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps clearbit payload into enrichment fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          category: { industry: "SaaS" },
          metrics: { employees: 120 },
          location: "NYC",
        }),
      }),
    );

    const adapter = new ClearbitAdapter("api-key", "https://clearbit.test");
    const result = await adapter.enrich({
      tenantId: "t1",
      leadId: "l1",
      companyDomain: "acme.com",
    });

    expect(result.provider).toBe("clearbit");
    expect(result.fields.industry?.value).toBe("SaaS");
    expect(result.fields.companySize?.value).toBe(120);
  });
});
