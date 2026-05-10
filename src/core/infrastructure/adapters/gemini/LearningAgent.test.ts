import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiLearningAgent } from "@/src/core/infrastructure/adapters/gemini/LearningAgent";

describe("GeminiLearningAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid learning decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.77,
          reasoning: "ok",
          metadata: { suggestedUpdates: [{ component: "sequence", change: "test", impact: "low" }] },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiLearningAgent("test-key").execute(AgentAction.QualifyLead, { outcomes: 100 });
    expect(decision.action).toBe(AgentAction.UpdateStrategy);
  });
});
