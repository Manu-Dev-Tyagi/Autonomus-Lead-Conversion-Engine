import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiIntakeAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.CreateLead,
      parsed,
      "Lead intake normalization generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Normalize lead input and identify required missing fields.",
      `Context: ${JSON.stringify(context)}`,
      "Return a safe intake result for downstream enrichment.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { normalizedLead, missingFields }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const normalizedLead = payload.normalizedLead;
    const missingFields = payload.missingFields;
    return (
      decision.action === AgentAction.CreateLead &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof normalizedLead === "object" &&
      normalizedLead !== null &&
      Array.isArray(missingFields)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { email: "alex@acme.com", source: "form" },
        output: {
          confidence: 0.9,
          reasoning: "Lead payload is valid and normalized.",
          alternatives: [],
          metadata: { normalizedLead: { email: "alex@acme.com" }, missingFields: [] },
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
