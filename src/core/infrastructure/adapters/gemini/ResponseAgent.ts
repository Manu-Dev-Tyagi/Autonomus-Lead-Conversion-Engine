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
      "YOU ARE THE INBOUND RESPONSE INTELLIGENCE AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: INTERPRET THE INTENT, SENTIMENT, AND URGENCY OF INBOUND REPLIES TO DRIVE THE NEXT CAMPAIGN STEP.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. INTENT DETECTION: IS THE LEAD INTERESTED, ASKING A QUESTION, RAISING AN OBJECTION, OR REJECTING?",
      "2. SENTIMENT ANALYSIS: DETECT NUANCE (e.g., 'Not now' vs 'Never').",
      "3. ACTIONABLE INSIGHTS: WHAT IS THE EXACT NEXT STEP? (Book, Answer, Nurture, Opt-out).",
      "4. DATA EXTRACTION: EXTRACT PHONE NUMBERS, DATES, OR ALTERNATIVE CONTACTS MENTIONED.",
      "",
      "--- CONTEXT ---",
      `INBOUND_REPLY: ${JSON.stringify(context.reply ?? context.replyText ?? {})}`,
      `CAMPAIGN_HISTORY: ${JSON.stringify(context.history ?? [])}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "linguistic analysis of the response",',
      '  "alternatives": ["alternative interpretation"],',
      '  "metadata": {',
      '    "intent": "interested" | "not_interested" | "objection" | "question" | "unclear",',
      '    "sentiment": "positive" | "neutral" | "negative",',
      '    "urgency": "low" | "medium" | "high",',
      '    "nextAction": "SCHEDULE_MEETING" | "ANSWER_QUESTION" | "HAND_OFF_TO_HUMAN" | "STOP_OUTREACH",',
      '    "extractedInfo": { "phone", "meetingDate", "newContactEmail" }',
      "  }",
      "}",
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
