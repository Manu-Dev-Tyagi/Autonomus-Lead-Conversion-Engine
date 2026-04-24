import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { LlmAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/LlmAgentGatewayAdapter";

describe("LlmAgentGatewayAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("parses Gemini JSON response into agent decision", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"confidence":0.91,"reasoning":"High fit","alternatives":["wait"],"metadata":{"source":"test"}}',
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new LlmAgentGatewayAdapter();
    const decision = await adapter.execute(AgentAction.ScoreLead, { leadId: "x" });

    expect(decision.confidence).toBe(0.91);
    expect(decision.reasoning).toBe("High fit");
    expect(decision.alternatives).toEqual(["wait"]);
  });

  it("falls back safely when model response is non-json", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new LlmAgentGatewayAdapter();
    const decision = await adapter.execute(AgentAction.ScoreLead, { leadId: "x" });

    expect(decision.confidence).toBe(0.5);
    expect(decision.reasoning).toContain("Fallback");
  });

  it("enforces token and cost budgets before API call", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.ALE_LLM_MAX_PROMPT_CHARS = "20";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new LlmAgentGatewayAdapter();
    await expect(
      adapter.execute(AgentAction.ScoreLead, { veryLong: "this-is-way-beyond-budget" }),
    ).rejects.toThrowError("Prompt exceeds ALE_LLM_MAX_PROMPT_CHARS budget.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
