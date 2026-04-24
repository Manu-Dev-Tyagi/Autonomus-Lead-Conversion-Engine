import { afterEach, describe, expect, it, vi } from "vitest";

import { ApolloAdapter } from "@/src/core/infrastructure/adapters/enrichment/ApolloAdapter";

describe("ApolloAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps apollo payload into enrichment fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          person: {
            title: "VP Sales",
            seniority: "executive",
            linkedin_url: "https://linkedin.com/in/x",
          },
        }),
      }),
    );

    const adapter = new ApolloAdapter("api-key", "https://apollo.test");
    const result = await adapter.enrich({
      tenantId: "t1",
      leadId: "l1",
      email: "lead@acme.com",
    });

    expect(result.provider).toBe("apollo");
    expect(result.fields.title?.value).toBe("VP Sales");
    expect(result.fields.linkedinUrl?.value).toContain("linkedin.com");
  });
});
