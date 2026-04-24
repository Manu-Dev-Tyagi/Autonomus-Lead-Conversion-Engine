import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiEnrichmentAgent } from "@/src/core/infrastructure/adapters/gemini/EnrichmentAgent";

describe("GeminiEnrichmentAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid enrichment decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.8,
          reasoning: "ok",
          metadata: { enrichedFields: { industry: "SaaS" }, missingSignals: [] },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiEnrichmentAgent("test-key").execute(AgentAction.EnrichLead, { company: "Acme" });
    expect(decision.action).toBe(AgentAction.EnrichLead);
  });
});
