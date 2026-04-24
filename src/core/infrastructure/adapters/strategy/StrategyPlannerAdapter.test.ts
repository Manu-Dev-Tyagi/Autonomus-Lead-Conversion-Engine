import { describe, expect, it, vi } from "vitest";

import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { StrategyPlannerAdapter } from "@/src/core/infrastructure/adapters/strategy/StrategyPlannerAdapter";

describe("StrategyPlannerAdapter", () => {
  it("uses LLM-selected sequence with performance context and AB hook", async () => {
    const sequenceLibrary = {
      listByTenant: vi.fn().mockResolvedValue([
        { id: "seq_a", tenantId: "t1", name: "A", stepCount: 4, channel: "email" },
        { id: "seq_b", tenantId: "t1", name: "B", stepCount: 3, channel: "email" },
      ]),
    };
    const performance = {
      getSequencePerformance: vi.fn().mockResolvedValue([
        { sequenceId: "seq_a", segmentKey: "example.com", replyRate: 0.11, bookingRate: 0.04, sampleSize: 40 },
        { sequenceId: "seq_b", segmentKey: "example.com", replyRate: 0.22, bookingRate: 0.06, sampleSize: 44 },
      ]),
    };
    const experiments = { assign: vi.fn().mockResolvedValue("seq_b") };
    const agentGateway = {
      execute: vi.fn().mockResolvedValue({
        action: AgentAction.PlanSequence,
        confidence: 0.86,
        reasoning: "Sequence A has better long-tail conversion quality.",
        alternatives: ["seq_b"],
        metadata: { sequenceId: "seq_a", stepCount: 4 },
      }),
    };

    const adapter = new StrategyPlannerAdapter(
      sequenceLibrary as any,
      performance as any,
      experiments as any,
      agentGateway as any,
    );
    const plan = await adapter.plan({
      tenantId: "t1",
      leadId: "lead-1",
      leadEmail: "lead@example.com",
    });

    expect(plan.sequenceId).toBe("seq_a");
    expect(plan.expectedReplyRate).toBeCloseTo(0.11, 5);
    expect(plan.experimentVariant).toBe("seq_b");
    expect(agentGateway.execute).toHaveBeenCalledWith(
      AgentAction.PlanSequence,
      expect.objectContaining({
        segmentKey: "example.com",
      }),
    );
  });

  it("falls back to AB-assigned sequence when LLM planning fails", async () => {
    const sequenceLibrary = {
      listByTenant: vi.fn().mockResolvedValue([
        { id: "seq_a", tenantId: "t1", name: "A", stepCount: 4, channel: "email" },
        { id: "seq_b", tenantId: "t1", name: "B", stepCount: 3, channel: "email" },
      ]),
    };
    const performance = {
      getSequencePerformance: vi.fn().mockResolvedValue([
        { sequenceId: "seq_a", segmentKey: "default", replyRate: 0.14, bookingRate: 0.05, sampleSize: 20 },
        { sequenceId: "seq_b", segmentKey: "default", replyRate: 0.2, bookingRate: 0.07, sampleSize: 22 },
      ]),
    };
    const experiments = { assign: vi.fn().mockResolvedValue("seq_b") };
    const agentGateway = { execute: vi.fn().mockRejectedValue(new Error("gateway down")) };

    const adapter = new StrategyPlannerAdapter(
      sequenceLibrary as any,
      performance as any,
      experiments as any,
      agentGateway as any,
    );
    const plan = await adapter.plan({
      tenantId: "t1",
      leadId: "lead-2",
    });

    expect(plan.sequenceId).toBe("seq_b");
    expect(plan.expectedReplyRate).toBeCloseTo(0.2, 5);
  });
});
