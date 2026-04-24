import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiStrategyAgent } from "@/src/core/infrastructure/adapters/gemini/StrategyAgent";

describe("GeminiStrategyAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid strategy decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.8,
          reasoning: "ok",
          metadata: { sequenceId: "seq-a", stepCount: 4 },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiStrategyAgent("test-key").execute(AgentAction.PlanSequence, { segment: "saas" });
    expect(decision.action).toBe(AgentAction.PlanSequence);
  });
});
