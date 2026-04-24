import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiResponseAgent } from "@/src/core/infrastructure/adapters/gemini/ResponseAgent";

describe("GeminiResponseAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid response interpretation decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.88,
          reasoning: "ok",
          metadata: { intent: "interested", sentiment: "positive", nextAction: "SCHEDULE_MEETING" },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiResponseAgent("test-key").execute(AgentAction.InterpretResponse, { replyText: "yes" });
    expect(decision.action).toBe(AgentAction.InterpretResponse);
  });
});
