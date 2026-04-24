import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiEnrichmentAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.EnrichLead,
      parsed,
      "Enrichment output generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Enrich lead and company data with confidence-aware inferred fields.",
      `Context: ${JSON.stringify(context)}`,
      "Identify useful firmographic and contact signals and unresolved gaps.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { enrichedFields, missingSignals }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const enrichedFields = payload.enrichedFields;
    const missingSignals = payload.missingSignals;
    return (
      decision.action === AgentAction.EnrichLead &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof enrichedFields === "object" &&
      enrichedFields !== null &&
      Array.isArray(missingSignals)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { company: "Acme", title: "VP Sales" },
        output: {
          confidence: 0.82,
          reasoning: "Sufficient public data signals for enrichment.",
          alternatives: ["REQUEST_MANUAL_REVIEW"],
          metadata: { enrichedFields: { industry: "SaaS" }, missingSignals: [] },
        },
      },
    ];
  }

  private getPayload(metadata: Record<string, unknown>): Record<string, unknown> {
    if (typeof metadata.metadata === "object" && metadata.metadata) {
      return metadata.metadata as Record<string, unknown>;
    }
    return metadata;
  }
}
