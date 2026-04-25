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
      "YOU ARE THE OUTREACH STRATEGIST AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: SELECT THE OPTIMAL OUTREACH SEQUENCE BASED ON LEAD QUALITY AND SEGMENT PERFORMANCE.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. INTENSITY: HIGH-SCORE LEADS (80+) GET HIGH-TOUCH SEQUENCES. LOW-SCORE GET AUTOMATED NURTURE.",
      "2. SEGMENTATION: TAILOR THE SEQUENCE TYPE (Value-led, Direct-ask, Soft-intro) TO THE INDUSTRY.",
      "3. EFFICIENCY: MINIMIZE TOUCHES IF A LEAD IS LIKELY TO CONVERT EARLY.",
      "4. EXPERIMENTATION: OCCASIONALLY TRY ALTERNATIVE SEQUENCES FOR A/B TESTING DATA.",
      "",
      "--- CONTEXT ---",
      `LEAD_PROFILE: ${JSON.stringify(context.lead ?? {})}`,
      `LEAD_SCORE: ${context.score ?? 50}`,
      `AVAILABLE_TEMPLATES: ${JSON.stringify(context.templates ?? [])}`,
      `PAST_PERFORMANCE: ${JSON.stringify(context.performanceMetrics ?? {})}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "strategic justification for sequence selection",',
      '  "alternatives": ["list", "of", "other", "valid", "sequences"],',
      '  "metadata": {',
      '    "sequenceId": "unique_id_of_selected_template",',
      '    "stepCount": integer,',
      '    "strategyType": "aggressive" | "passive" | "educational",',
      '    "expectedConversionRate": float',
      "  }",
      "}",
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
