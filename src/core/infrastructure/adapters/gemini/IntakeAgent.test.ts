import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiIntakeAgent } from "@/src/core/infrastructure/adapters/gemini/IntakeAgent";

describe("GeminiIntakeAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid intake decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.9,
          reasoning: "ok",
          metadata: { normalizedLead: { email: "a@b.com" }, missingFields: [] },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiIntakeAgent("test-key").execute(AgentAction.CreateLead, { email: "a@b.com" });
    expect(decision.action).toBe(AgentAction.CreateLead);
  });
});
