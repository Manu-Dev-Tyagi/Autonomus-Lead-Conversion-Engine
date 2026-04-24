import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiOrchestratorAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.OrchestrateWorkflow,
      parsed,
      "Workflow orchestration recommendation generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "Coordinate the next best workflow step across available specialist agents.",
      `Context: ${JSON.stringify(context)}`,
      "Select one next agent and explain why to keep flow deterministic.",
      "Output JSON with: confidence, reasoning, alternatives, metadata { nextAgent, rationale }",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const nextAgent = payload.nextAgent;
    const rationale = payload.rationale;
    return (
      decision.action === AgentAction.OrchestrateWorkflow &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof nextAgent === "string" &&
      nextAgent.length > 0 &&
      typeof rationale === "string" &&
      rationale.length > 0
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: {
          currentState: "enriched",
          availableAgents: ["scoring", "strategy"],
        },
        output: {
          confidence: 0.83,
          reasoning: "Scoring must run before planning outreach.",
          alternatives: ["strategy"],
          metadata: {
            nextAgent: "scoring",
            rationale: "Qualification score gates downstream outreach actions.",
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
