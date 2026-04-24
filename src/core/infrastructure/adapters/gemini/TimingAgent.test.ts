import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiTimingAgent } from "@/src/core/infrastructure/adapters/gemini/TimingAgent";

describe("GeminiTimingAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid timing decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.79,
          reasoning: "ok",
          metadata: { scheduledAt: "2026-04-27T14:00:00Z", timezone: "America/New_York" },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiTimingAgent("test-key").execute(AgentAction.OptimizeTiming, { timezone: "America/New_York" });
    expect(decision.action).toBe(AgentAction.OptimizeTiming);
  });
});
