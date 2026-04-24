import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { LlmAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/LlmAgentGatewayAdapter";

describe("LlmAgentGatewayAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.ALE_GEMINI_SCORE_LEAD_TEMPERATURE;
    delete process.env.ALE_SCORING_USE_POSTGRES_OUTCOMES;
    delete process.env.ALE_SCORING_HISTORICAL_SEED;
    delete process.env.ALE_LLM_MAX_PROMPT_CHARS;
    delete process.env.ALE_LLM_MAX_ESTIMATED_TOKENS;
    delete process.env.ALE_LLM_USD_PER_1K_TOKENS;
    delete process.env.ALE_LLM_MAX_USD_PER_REQUEST;
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
    const decision = await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "tenant-x",
      leadId: "x",
    });

    expect(decision.confidence).toBeGreaterThan(0.7);
    expect(decision.confidence).toBeLessThan(0.91);
    expect(decision.reasoning).toBe("High fit");
    expect(decision.alternatives).toEqual(["wait"]);
    expect(decision.metadata.scores).toBeDefined();
    expect(decision.metadata.historicalConversionRate).toBeDefined();
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
    const decision = await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "tenant-x",
      leadId: "x",
    });

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
      adapter.execute(AgentAction.ScoreLead, {
        tenantId: "tenant-x",
        leadId: "lead-x",
        veryLong: "this-is-way-beyond-budget",
      }),
    ).rejects.toThrowError("Prompt exceeds ALE_LLM_MAX_PROMPT_CHARS budget.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fallback when specialized validation fails", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    confidence: 0.7,
                    reasoning: "Reply looks positive.",
                    metadata: { intent: "interested" },
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new LlmAgentGatewayAdapter();
    await expect(
      adapter.execute(AgentAction.InterpretResponse, { replyText: "interested" }),
    ).rejects.toThrowError("Agent decision failed validation.");
  });

  it("applies per-action generation config to specialized agent", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.ALE_GEMINI_SCORE_LEAD_TEMPERATURE = "0.55";
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
    await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "t1",
      leadId: "l1",
      email: "x@example.com",
    });

    const firstCall = fetchMock.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(firstCall[1].body) as { generationConfig?: { temperature?: number } };
    expect(body.generationConfig?.temperature).toBe(0.55);
  });

  it("falls back to generic path for SEND_EMAIL", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"confidence":0.73,"reasoning":"Safe to send","alternatives":[],"metadata":{"source":"generic"}}',
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new LlmAgentGatewayAdapter();
    const decision = await adapter.execute(AgentAction.SendEmail, {
      tenantId: "tenant-x",
      leadId: "lead-x",
      subject: "Hello",
    });

    expect(decision.action).toBe(AgentAction.SendEmail);
    expect(decision.confidence).toBe(0.73);
  });
});
