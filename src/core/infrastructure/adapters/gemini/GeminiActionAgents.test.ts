import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiComposerAgent } from "@/src/core/infrastructure/adapters/gemini/ComposerAgent";
import { GeminiIntakeAgent } from "@/src/core/infrastructure/adapters/gemini/IntakeAgent";
import { GeminiResponseAgent } from "@/src/core/infrastructure/adapters/gemini/ResponseAgent";

describe("Gemini action agents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns composer decision when required metadata exists", async () => {
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
                      confidence: 0.9,
                      reasoning: "Personalized and concise.",
                      alternatives: [],
                      metadata: { subject: "Subject", emailBody: "Hello", ctaPresent: true },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const agent = new GeminiComposerAgent("test-key");
    const decision = await agent.execute(AgentAction.ComposeMessage, { leadName: "Alex" });

    expect(decision.action).toBe(AgentAction.ComposeMessage);
    expect(decision.confidence).toBe(0.9);
  });

  it("rejects response decision missing required metadata fields", async () => {
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
                      confidence: 0.7,
                      reasoning: "Reply indicates interest.",
                      alternatives: [],
                      metadata: { intent: "interested" },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const agent = new GeminiResponseAgent("test-key");
    await expect(
      agent.execute(AgentAction.InterpretResponse, { replyText: "Interested" }),
    ).rejects.toThrowError("Agent decision failed validation.");
  });

  it("supports intake normalization output contract", async () => {
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
                      confidence: 0.85,
                      reasoning: "All required fields are present.",
                      alternatives: [],
                      metadata: { normalizedLead: { email: "a@b.com" }, missingFields: [] },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const agent = new GeminiIntakeAgent("test-key");
    const decision = await agent.execute(AgentAction.CreateLead, { email: "a@b.com" });

    expect(decision.action).toBe(AgentAction.CreateLead);
    expect((decision.metadata.metadata as Record<string, unknown>).normalizedLead).toEqual({
      email: "a@b.com",
    });
  });
});
