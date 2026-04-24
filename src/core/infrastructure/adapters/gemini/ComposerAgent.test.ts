import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiComposerAgent } from "@/src/core/infrastructure/adapters/gemini/ComposerAgent";

describe("GeminiComposerAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid composer decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.86,
          reasoning: "ok",
          metadata: { subject: "Hello", emailBody: "Hi there", ctaPresent: true },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiComposerAgent("test-key").execute(AgentAction.ComposeMessage, { leadName: "Alex" });
    expect(decision.action).toBe(AgentAction.ComposeMessage);
  });
});
