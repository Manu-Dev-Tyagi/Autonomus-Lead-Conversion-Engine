import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiTimingAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.OptimizeTiming,
      parsed,
      "Timing decision generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Recommend optimal send timing using timezone and engagement cues.",
      `Context: ${JSON.stringify(context)}`,
      "Prefer business hours and suggest one primary scheduled timestamp.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { scheduledAt, timezone }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const scheduledAt = payload.scheduledAt;
    const timezone = payload.timezone;
    return (
      decision.action === AgentAction.OptimizeTiming &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof scheduledAt === "string" &&
      scheduledAt.length > 0 &&
      typeof timezone === "string" &&
      timezone.length > 0
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { timezone: "America/New_York", role: "CTO" },
        output: {
          confidence: 0.79,
          reasoning: "Historical data suggests highest open rates at 10:00 local time.",
          alternatives: ["2026-04-27T15:00:00Z"],
          metadata: { scheduledAt: "2026-04-27T14:00:00Z", timezone: "America/New_York" },
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
