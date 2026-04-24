import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";
import { CachedEnrichmentProvider } from "@/src/core/infrastructure/adapters/enrichment/CachedEnrichmentProvider";

describe("CachedEnrichmentProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns cached results within TTL", async () => {
    const delegate: IEnrichmentProvider = {
      name: "mock",
      enrich: vi.fn(async (_context: EnrichmentContext): Promise<EnrichmentResult> => ({
        provider: "mock",
        fields: {
          industry: { value: "SaaS", confidence: 0.9, source: "mock" },
        },
        missingSignals: [],
      })),
    };
    const cached = new CachedEnrichmentProvider(delegate, 10_000);
    const context: EnrichmentContext = {
      tenantId: "t1",
      leadId: "l1",
      companyDomain: "acme.com",
    };

    await cached.enrich(context);
    await cached.enrich(context);

    expect(delegate.enrich).toHaveBeenCalledTimes(1);
  });
});
