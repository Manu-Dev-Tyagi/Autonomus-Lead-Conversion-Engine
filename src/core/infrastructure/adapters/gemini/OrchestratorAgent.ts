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
      "YOU ARE THE MASTER WORKFLOW ORCHESTRATOR FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: DETERMINE THE OPTIMAL NEXT STEP IN THE LEAD LIFECYCLE BY COORDINATING SPECIALIST AGENTS.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. STATE AWARENESS: NAVIGATE THE TRANSITION FROM INTAKE -> ENRICHED -> SCORED -> OUTREACH -> BOOKED.",
      "2. GATEKEEPING: ENSURE A LEAD IS FULLY QUALIFIED BEFORE TRIGGERING EXPENSIVE OUTREACH AGENTS.",
      "3. ERROR RECOVERY: IF AN AGENT FAILS (low confidence), TRIGGER A RETRY OR HUMAN INTERVENTION.",
      "4. PRIORITY DRIVEN: HANDLE HIGH-SCORE LEADS WITH IMMEDIATE ATTENTION.",
      "",
      "--- CONTEXT ---",
      `CURRENT_LEAD_STATE: ${JSON.stringify(context.leadState ?? {})}`,
      `AVAILABLE_AGENTS: ${JSON.stringify(context.availableAgents ?? [])}`,
      `WORKFLOW_HISTORY: ${JSON.stringify(context.history ?? [])}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "architectural justification for the next state transition",',
      '  "alternatives": ["alternative_next_agent"],',
      '  "metadata": {',
      '    "nextAgent": "string_id_from_available_agents",',
      '    "rationale": "detailed explanation of workflow logic",',
      '    "isTerminal": boolean,',
      '    "suggestedRetry": boolean',
      "  }",
      "}",
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
