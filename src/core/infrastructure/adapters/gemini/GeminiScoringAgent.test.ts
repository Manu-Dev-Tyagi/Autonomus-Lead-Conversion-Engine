import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiScoringAgent } from "@/src/core/infrastructure/adapters/gemini/GeminiScoringAgent";

describe("GeminiScoringAgent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ALE_LLM_MAX_PROMPT_CHARS;
  });

  it("builds a scoring decision from JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    confidence: 0.82,
                    reasoning: "ICP and intent look strong.",
                    score: 82,
                    alternatives: ["REVIEW"],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const agent = new GeminiScoringAgent("test-key", "gemini-test");
    const decision = await agent.execute(AgentAction.ScoreLead, {
      lead: { title: "CTO", industry: "SaaS" },
      tenantConfig: { industries: ["SaaS"] },
    });

    expect(decision.action).toBe(AgentAction.ScoreLead);
    expect(decision.confidence).toBe(0.82);
    expect(decision.reasoning).toContain("strong");
    expect(decision.metadata.model).toBe("gemini-test");
  });

  it("rejects over-budget prompts before calling API", async () => {
    process.env.ALE_LLM_MAX_PROMPT_CHARS = "50";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const agent = new GeminiScoringAgent("test-key");
    await expect(
      agent.execute(AgentAction.ScoreLead, {
        lead: { about: "x".repeat(500) },
      }),
    ).rejects.toThrowError("Prompt exceeds ALE_LLM_MAX_PROMPT_CHARS budget.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
