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
          metadata: { 
            subject: "Quick idea for Acme growth", 
            emailBody: "Hi Alex, I was looking at Acme's recent expansion into the European market and was really impressed by your approach to localized payments. I have a few thoughts on how we could potentially streamline your checkout process to increase conversion rates by another 5-10%. Would you be open to a quick 15-minute introductory call next Tuesday or Wednesday afternoon to discuss this further? Best, Manu.", 
            ctaCount: 1 
          },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiComposerAgent("test-key").execute(AgentAction.ComposeMessage, { leadName: "Alex" });
    expect(decision.action).toBe(AgentAction.ComposeMessage);
  });
});
