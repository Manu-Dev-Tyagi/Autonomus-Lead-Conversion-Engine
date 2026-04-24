import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiBookingAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.ScheduleMeeting,
      parsed,
      "Booking decision generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Coordinate meeting booking and select the best available slot.",
      `Context: ${JSON.stringify(context)}`,
      "Prefer earliest valid option and include duration.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { slot, durationMinutes }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const slot = payload.slot;
    const durationMinutes = payload.durationMinutes;
    return (
      decision.action === AgentAction.ScheduleMeeting &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof slot === "string" &&
      slot.length > 0 &&
      typeof durationMinutes === "number" &&
      durationMinutes > 0 &&
      durationMinutes <= 240
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { proposedSlots: ["2026-04-27T14:00:00Z"] },
        output: {
          confidence: 0.81,
          reasoning: "Selected earliest mutually available slot.",
          alternatives: ["2026-04-27T15:00:00Z"],
          metadata: { slot: "2026-04-27T14:00:00Z", durationMinutes: 30 },
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
