import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

const ALLOWED_INTENTS = ["interested", "not_interested", "objection", "question", "unclear"];
const ALLOWED_SENTIMENTS = ["positive", "neutral", "negative"];

export class GeminiResponseAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.InterpretResponse,
      parsed,
      "Inbound response interpreted with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Interpret inbound email response and classify intent.",
      `Context: ${JSON.stringify(context)}`,
      "Classify intent and sentiment and provide best next action.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { intent, sentiment, nextAction }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const intent = payload.intent;
    const sentiment = payload.sentiment;
    const nextAction = payload.nextAction;
    return (
      decision.action === AgentAction.InterpretResponse &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof intent === "string" &&
      ALLOWED_INTENTS.includes(intent) &&
      typeof sentiment === "string" &&
      ALLOWED_SENTIMENTS.includes(sentiment) &&
      typeof nextAction === "string" &&
      nextAction.length > 0
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { replyText: "Sounds good, can we do Tuesday?" },
        output: {
          confidence: 0.88,
          reasoning: "Clear positive intent with scheduling signal.",
          alternatives: ["ask_for_timezone"],
          metadata: {
            intent: "interested",
            sentiment: "positive",
            nextAction: "SCHEDULE_MEETING",
          },
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
