import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiOrchestratorAgent } from "@/src/core/infrastructure/adapters/gemini/OrchestratorAgent";

describe("GeminiOrchestratorAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid orchestrator decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.83,
          reasoning: "ok",
          metadata: { nextAgent: "scoring", rationale: "Score first" },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiOrchestratorAgent("test-key").execute(
      AgentAction.OrchestrateWorkflow,
      { currentState: "enriched" },
    );
    expect(decision.action).toBe(AgentAction.OrchestrateWorkflow);
  });
});
