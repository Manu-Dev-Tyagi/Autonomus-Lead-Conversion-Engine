import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiBookingAgent } from "@/src/core/infrastructure/adapters/gemini/BookingAgent";

describe("GeminiBookingAgent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns valid booking decision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          confidence: 0.81,
          reasoning: "ok",
          metadata: { slot: "2026-04-27T14:00:00Z", durationMinutes: 30 },
        }) }] } }],
      }),
    }));
    const decision = await new GeminiBookingAgent("test-key").execute(AgentAction.ScheduleMeeting, { proposedSlots: [] });
    expect(decision.action).toBe(AgentAction.ScheduleMeeting);
  });
});
