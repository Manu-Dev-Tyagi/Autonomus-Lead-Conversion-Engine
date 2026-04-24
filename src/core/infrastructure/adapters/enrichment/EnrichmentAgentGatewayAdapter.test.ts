import { describe, expect, it } from "vitest";

import { AgentContextByAction, AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { EnrichmentAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/enrichment/EnrichmentAgentGatewayAdapter";
import { IEnrichmentProvider } from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

describe("EnrichmentAgentGatewayAdapter", () => {
  it("aggregates provider fields into enrichment decision", async () => {
    const providers: IEnrichmentProvider[] = [
      {
        name: "p1",
        async enrich() {
          return {
            provider: "p1",
            fields: {
              industry: { value: "SaaS", confidence: 0.8, source: "p1" },
            },
            missingSignals: [],
          };
        },
      },
      {
        name: "p2",
        async enrich() {
          return {
            provider: "p2",
            fields: {
              companySize: { value: 120, confidence: 0.9, source: "p2" },
            },
            missingSignals: ["title"],
          };
        },
      },
    ];
    const fallback: AgentGatewayPort = {
      async execute(): Promise<AgentDecision> {
        return {
          action: AgentAction.EnrichLead,
          confidence: 0.5,
          reasoning: "fallback",
          alternatives: [],
          metadata: {},
        };
      },
    };

    const adapter = new EnrichmentAgentGatewayAdapter(providers, fallback);
    const decision = await adapter.execute(AgentAction.EnrichLead, {
      tenantId: "t1",
      leadId: "l1",
      companyDomain: "acme.com",
    });

    expect(decision.action).toBe(AgentAction.EnrichLead);
    expect(decision.confidence).toBeGreaterThan(0.8);
    expect((decision.metadata.enrichedFields as Record<string, unknown>).industry).toBe("SaaS");
    expect((decision.metadata.enrichedFields as Record<string, unknown>).companySize).toBe(120);
  });

  it("delegates non-enrichment actions to fallback", async () => {
    const fallback: AgentGatewayPort = {
      async execute<TAction extends AgentAction>(
        action: TAction,
        _context: AgentContextByAction[TAction] & Record<string, unknown>,
      ): Promise<AgentDecision> {
        return {
          action,
          confidence: 0.7,
          reasoning: "fallback",
          alternatives: [],
          metadata: {},
        };
      },
    };
    const adapter = new EnrichmentAgentGatewayAdapter([], fallback);
    const decision = await adapter.execute(AgentAction.ScoreLead, {
      tenantId: "t1",
      leadId: "l1",
    });
    expect(decision.action).toBe(AgentAction.ScoreLead);
  });
});
