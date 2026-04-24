import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiBookingAgent } from "@/src/core/infrastructure/adapters/gemini/BookingAgent";
import { GeminiEnrichmentAgent } from "@/src/core/infrastructure/adapters/gemini/EnrichmentAgent";
import { GeminiLearningAgent } from "@/src/core/infrastructure/adapters/gemini/LearningAgent";
import { GeminiTimingAgent } from "@/src/core/infrastructure/adapters/gemini/TimingAgent";

describe("Gemini custom agent contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts enrichment payload contract", async () => {
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
                      confidence: 0.8,
                      reasoning: "Enrichment sufficient.",
                      metadata: {
                        enrichedFields: { industry: "SaaS" },
                        missingSignals: [],
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );
    const agent = new GeminiEnrichmentAgent("test-key");
    const decision = await agent.execute(AgentAction.EnrichLead, { company: "Acme" });
    expect(decision.action).toBe(AgentAction.EnrichLead);
  });

  it("accepts timing payload contract", async () => {
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
                      confidence: 0.75,
                      reasoning: "Best open window.",
                      metadata: {
                        scheduledAt: "2026-04-27T14:00:00Z",
                        timezone: "America/New_York",
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );
    const agent = new GeminiTimingAgent("test-key");
    const decision = await agent.execute(AgentAction.OptimizeTiming, { timezone: "America/New_York" });
    expect(decision.action).toBe(AgentAction.OptimizeTiming);
  });

  it("accepts booking payload contract", async () => {
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
                      confidence: 0.83,
                      reasoning: "Earliest valid slot.",
                      metadata: { slot: "2026-04-27T14:00:00Z", durationMinutes: 30 },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );
    const agent = new GeminiBookingAgent("test-key");
    const decision = await agent.execute(AgentAction.ScheduleMeeting, { proposedSlots: [] });
    expect(decision.action).toBe(AgentAction.ScheduleMeeting);
  });

  it("accepts learning payload contract", async () => {
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
                      reasoning: "Detected a useful pattern.",
                      metadata: { patterns: [{ segment: "saas" }], recommendations: [] },
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );
    const agent = new GeminiLearningAgent("test-key");
    const decision = await agent.execute(AgentAction.QualifyLead, { outcomes: 100 });
    expect(decision.action).toBe(AgentAction.QualifyLead);
  });
});
