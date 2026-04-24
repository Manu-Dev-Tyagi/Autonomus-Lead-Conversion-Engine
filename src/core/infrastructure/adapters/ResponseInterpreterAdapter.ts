import { ResponseInterpreterPort } from "@/src/core/application/ports/ResponseInterpreterPort";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiResponseAgent } from "@/src/core/infrastructure/adapters/gemini/ResponseAgent";

export interface ReplyAnalysis {
  readonly intent: ResponseIntent;
  readonly sentiment: "positive" | "neutral" | "negative";
  readonly entities: {
    dates: string[];
    objections: string[];
    questions: string[];
  };
  readonly nextAction: "TRIGGER_BOOKING" | "HANDLE_OBJECTION" | "ANSWER_QUESTION" | "EXIT_SEQUENCE";
  readonly confidence: number;
}

export class ResponseInterpreterAdapter implements ResponseInterpreterPort {
  constructor(private readonly responseAgent: GeminiResponseAgent) {}

  async interpret(input: { tenantId: string; leadId: string; inboundText: string }): Promise<ResponseIntent> {
    const analysis = await this.analyze(input);
    return analysis.intent;
  }

  async analyze(input: { tenantId: string; leadId: string; inboundText: string }): Promise<ReplyAnalysis> {
    const decision = await this.responseAgent.execute(AgentAction.InterpretResponse, {
      tenantId: input.tenantId,
      leadId: input.leadId,
      replyText: input.inboundText,
    });
    const payload = this.readMetadata(decision.metadata);
    const intent = this.mapIntent(payload.intent);
    const sentiment = this.mapSentiment(payload.sentiment);
    const entities = this.extractEntities(input.inboundText);
    const nextAction = this.determineNextAction(intent, entities);

    return {
      intent,
      sentiment,
      entities,
      nextAction,
      confidence: decision.confidence,
    };
  }

  private mapIntent(value: unknown): ResponseIntent {
    if (value === "interested") return ResponseIntent.Positive;
    if (value === "not_interested" || value === "objection") return ResponseIntent.Negative;
    return ResponseIntent.Neutral;
  }

  private mapSentiment(value: unknown): "positive" | "neutral" | "negative" {
    if (value === "positive" || value === "negative") return value;
    return "neutral";
  }

  private determineNextAction(
    intent: ResponseIntent,
    entities: { objections: string[]; questions: string[] },
  ): ReplyAnalysis["nextAction"] {
    if (intent === ResponseIntent.Positive) return "TRIGGER_BOOKING";
    if (entities.objections.length > 0) return "HANDLE_OBJECTION";
    if (entities.questions.length > 0) return "ANSWER_QUESTION";
    return "EXIT_SEQUENCE";
  }

  private extractEntities(text: string): ReplyAnalysis["entities"] {
    const lower = text.toLowerCase();
    const objections: string[] = [];
    const questions: string[] = [];
    const dates = text.match(
      /\b(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}(am|pm)\b/gi,
    ) ?? [];

    if (/\b(not now|too busy|next quarter|timing)\b/i.test(lower)) objections.push("timing");
    if (/\b(budget|expensive|cost)\b/i.test(lower)) objections.push("budget");
    if (/\b\?\b/.test(text) || /\bhow\b|\bwhat\b|\bwhy\b/i.test(lower)) questions.push("question");

    return { dates, objections, questions };
  }

  private readMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    if (typeof metadata.metadata === "object" && metadata.metadata) {
      return metadata.metadata as Record<string, unknown>;
    }
    return metadata;
  }
}
