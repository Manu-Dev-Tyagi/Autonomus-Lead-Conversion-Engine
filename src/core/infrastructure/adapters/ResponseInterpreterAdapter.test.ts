import { describe, expect, it, vi } from "vitest";

import { ResponseInterpreterAdapter } from "@/src/core/infrastructure/adapters/ResponseInterpreterAdapter";
import { GeminiResponseAgent } from "@/src/core/infrastructure/adapters/gemini/ResponseAgent";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";

class StubGeminiResponseAgent extends GeminiResponseAgent {
  constructor(private readonly decisionFactory: (reply: string) => AgentDecision) {
    super("test-key");
  }

  async execute(_action: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const reply = String(context.replyText ?? "");
    return this.decisionFactory(reply);
  }
}

describe("ResponseInterpreterAdapter", () => {
  it("classifies positive booking intent with date entity", async () => {
    const agent = new StubGeminiResponseAgent(() => ({
      action: AgentAction.InterpretResponse,
      confidence: 0.91,
      reasoning: "clear interest",
      alternatives: [],
      metadata: { intent: "interested", sentiment: "positive", nextAction: "SCHEDULE_MEETING" },
    }));
    const adapter = new ResponseInterpreterAdapter(agent);

    const analysis = await adapter.analyze({
      tenantId: "t1",
      leadId: "l1",
      inboundText: "Sounds good. Tuesday 2pm works for me.",
    });

    expect(analysis.intent).toBe(ResponseIntent.Positive);
    expect(analysis.entities.dates.length).toBeGreaterThan(0);
    expect(analysis.nextAction).toBe("TRIGGER_BOOKING");
  });

  it("classifies objections and routes to objection handling", async () => {
    const agent = new StubGeminiResponseAgent(() => ({
      action: AgentAction.InterpretResponse,
      confidence: 0.78,
      reasoning: "budget concern",
      alternatives: [],
      metadata: { intent: "objection", sentiment: "negative", nextAction: "HANDLE_OBJECTION" },
    }));
    const adapter = new ResponseInterpreterAdapter(agent);

    const analysis = await adapter.analyze({
      tenantId: "t1",
      leadId: "l1",
      inboundText: "Looks expensive for us right now, maybe next quarter.",
    });

    expect(analysis.intent).toBe(ResponseIntent.Negative);
    expect(analysis.entities.objections).toContain("timing");
    expect(analysis.nextAction).toBe("HANDLE_OBJECTION");
  });

  it("classifies questions and routes to answer flow", async () => {
    const agent = new StubGeminiResponseAgent(() => ({
      action: AgentAction.InterpretResponse,
      confidence: 0.74,
      reasoning: "question",
      alternatives: [],
      metadata: { intent: "question", sentiment: "neutral", nextAction: "ANSWER_QUESTION" },
    }));
    const adapter = new ResponseInterpreterAdapter(agent);

    const analysis = await adapter.analyze({
      tenantId: "t1",
      leadId: "l1",
      inboundText: "How does this integrate with Salesforce?",
    });

    expect(analysis.intent).toBe(ResponseIntent.Neutral);
    expect(analysis.entities.questions.length).toBeGreaterThan(0);
    expect(analysis.nextAction).toBe("ANSWER_QUESTION");
  });

  it("interpret returns neutral for not interested flow", async () => {
    const agent = new StubGeminiResponseAgent(() => ({
      action: AgentAction.InterpretResponse,
      confidence: 0.8,
      reasoning: "not interested",
      alternatives: [],
      metadata: { intent: "not_interested", sentiment: "negative", nextAction: "EXIT_SEQUENCE" },
    }));
    const adapter = new ResponseInterpreterAdapter(agent);

    const intent = await adapter.interpret({
      tenantId: "t1",
      leadId: "l1",
      inboundText: "No thanks, please remove me.",
    });

    expect(intent).toBe(ResponseIntent.Negative);
  });
});
