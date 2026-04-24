import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiInferenceAdapter } from "@/src/core/infrastructure/adapters/enrichment/GeminiInferenceAdapter";

describe("GeminiInferenceAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("converts gemini metadata into enrichment fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      confidence: 0.8,
                      reasoning: "ok",
                      metadata: {
                        enrichedFields: { industry: "SaaS", companySize: 150 },
                        missingSignals: [],
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const adapter = new GeminiInferenceAdapter("test-key");
    const result = await adapter.enrich({
      tenantId: "t1",
      leadId: "l1",
      companyName: "Acme",
    });

    expect(result.provider).toBe("gemini_inference");
    expect(result.fields.industry?.value).toBe("SaaS");
    expect(result.fields.companySize?.value).toBe(150);
  });
});
