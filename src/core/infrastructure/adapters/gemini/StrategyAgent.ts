import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiStrategyAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.PlanSequence,
      parsed,
      "Sequence strategy selected with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Select the best outreach sequence for this lead profile.",
      `Context: ${JSON.stringify(context)}`,
      "Choose sequence and number of touches based on fit and expected performance.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { sequenceId, stepCount }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const sequenceId = payload.sequenceId;
    const stepCount = payload.stepCount;
    return (
      decision.action === AgentAction.PlanSequence &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof sequenceId === "string" &&
      sequenceId.length > 0 &&
      typeof stepCount === "number" &&
      stepCount >= 1 &&
      stepCount <= 10
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { segment: "mid_market_saas", score: 82 },
        output: {
          confidence: 0.8,
          reasoning: "Historical segment data favors 4-touch sequence.",
          alternatives: ["sequence_b"],
          metadata: { sequenceId: "sequence_a", stepCount: 4 },
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
