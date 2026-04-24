import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiLearningAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.QualifyLead,
      parsed,
      "Learning recommendations generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Analyze outcomes and propose safe optimization recommendations.",
      `Context: ${JSON.stringify(context)}`,
      "Return statistically meaningful patterns and actionable recommendations.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { patterns, recommendations }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const patterns = payload.patterns;
    const recommendations = payload.recommendations;
    return (
      decision.action === AgentAction.QualifyLead &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      Array.isArray(patterns) &&
      Array.isArray(recommendations)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { outcomes: 120 },
        output: {
          confidence: 0.77,
          reasoning: "Detected statistically relevant segment uplift.",
          alternatives: ["human_review"],
          metadata: { patterns: [{ segment: "saas_mid_market", lift: 0.12 }], recommendations: [] },
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
