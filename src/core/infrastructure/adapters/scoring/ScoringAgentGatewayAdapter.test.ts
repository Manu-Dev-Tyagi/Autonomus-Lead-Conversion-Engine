import { describe, expect, it } from "vitest";

import { AgentContextByAction, AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { ScoringAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/scoring/ScoringAgentGatewayAdapter";

class DelegateStub implements AgentGatewayPort {
  lastContext: Record<string, unknown> | null = null;

  async execute<TAction extends AgentAction>(
    action: TAction,
    context: AgentContextByAction[TAction] & Record<string, unknown>,
  ): Promise<AgentDecision> {
    this.lastContext = context;
    return {
      action,
      confidence: 0.8,
      reasoning: "ok",
      alternatives: [],
      metadata: {},
    };
  }
}

class OutcomesReaderStub implements HistoricalOutcomesReadPort {
  constructor(private readonly rate: number | null) {}
  async getConversionRate(): Promise<number | null> {
    return this.rate;
  }
}

describe("ScoringAgentGatewayAdapter", () => {
  it("injects factors and historical conversion into score context", async () => {
    const delegate = new DelegateStub();
    const adapter = new ScoringAgentGatewayAdapter(delegate, new OutcomesReaderStub(0.31));
    const decision = await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "t1",
      leadId: "l1",
      lead: { industry: "SaaS", intentSignals: ["pricing_page_visit"] },
      tenantConfig: { industries: ["SaaS"] },
    });

    const context = delegate.lastContext as Record<string, unknown>;
    expect(context.scores).toBeDefined();
    expect(context.historicalConversionRate).toBe(0.31);
    expect(decision.metadata.scores).toBeDefined();
    expect(decision.metadata.historicalConversionRate).toBe(0.31);
  });

  it("delegates non-score actions unchanged", async () => {
    const delegate = new DelegateStub();
    const adapter = new ScoringAgentGatewayAdapter(delegate, new OutcomesReaderStub(null));
    const decision = await adapter.execute(AgentAction.EnrichLead, {
      tenantId: "t1",
      leadId: "l1",
    });
    expect(decision.action).toBe(AgentAction.EnrichLead);
  });

  it("falls back to pattern average when reader returns null", async () => {
    const delegate = new DelegateStub();
    const adapter = new ScoringAgentGatewayAdapter(delegate, new OutcomesReaderStub(null));
    await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "t1",
      leadId: "l1",
      lead: { industry: "SaaS" },
      historicalPatterns: [{ conversionRate: 0.2 }, { conversionRate: 0.4 }],
    });
    const context = delegate.lastContext as Record<string, unknown>;
    expect(context.historicalConversionRate).toBeCloseTo(0.3, 5);
  });
});
