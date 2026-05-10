import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

const ALLOWED_INTENTS = ["INTERESTED", "SOFT_INTEREST", "OBJECTION", "QUESTION", "NOT_INTERESTED", "UNSUBSCRIBE", "UNCLEAR"];
const ALLOWED_OBJECTIONS = ["TIMING", "BUDGET", "AUTHORITY", "NEED", "TRUST", "COMPETITOR"];

export class GeminiResponseAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.InterpretResponse,
      parsed,
      "Response analyzed for intent and objections.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE RESPONSE TRIAGE AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: CLASSIFY INBOUND REPLIES WITH HIGH PRECISION TO DRIVE NEXT ACTIONS.",
      "",
      "--- INTENT CLASSES ---",
      "INTERESTED: Explicit interest or scheduling request.",
      "SOFT_INTEREST: Vague interest or 'tell me more'.",
      "OBJECTION: Raising a concern (timing, budget, etc.).",
      "QUESTION: Specific question about the product/service.",
      "NOT_INTERESTED: Explicit 'no' or 'not a fit'.",
      "UNSUBSCRIBE: Request to stop outreach.",
      "UNCLEAR: Mumbled or confusing response.",
      "",
      "--- OBJECTION TYPES ---",
      "TIMING: 'not now', 'maybe later', 'Q3'.",
      "BUDGET: 'no budget', 'too expensive'.",
      "AUTHORITY: 'not my decision', 'check with boss'.",
      "NEED: 'already have something', 'don't need this'.",
      "TRUST: 'who are you', 'seems like spam'.",
      "COMPETITOR: naming a competitor.",
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "multi-step analysis",',
      '  "metadata": {',
      '    "intent": "INTERESTED" | "SOFT_INTEREST" | "OBJECTION" | "QUESTION" | "NOT_INTERESTED" | "UNSUBSCRIBE" | "UNCLEAR",',
      '    "objectionType": "TIMING" | "BUDGET" | "AUTHORITY" | "NEED" | "TRUST" | "COMPETITOR" | null,',
      '    "nextAction": "TRIGGER_BOOKING" | "SEND_NURTURE" | "HANDLE_OBJECTION" | "ANSWER_QUESTION" | "EXIT_SEQUENCE",',
      '    "entities": { "dates", "competitors", "questions" }',
      '  }',
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const intent = payload.intent;
    const nextAction = payload.nextAction;
    return (
      decision.action === AgentAction.InterpretResponse &&
      decision.confidence >= 0.75 &&
      typeof intent === "string" &&
      ALLOWED_INTENTS.includes(intent) &&
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
