import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiLearningAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.UpdateStrategy,
      parsed,
      "Strategy update recommendation generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE SYSTEMS LEARNING & OPTIMIZATION AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: ANALYZE PERFORMANCE METRICS AND OUTCOMES TO RECOMMEND STRATEGIC SHIFTS IN OUTREACH PATTERNS.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. OUTCOME ANALYSIS: COMPARE SUCCESSFUL VS FAILED SEQUENCES.",
      "2. SEGMENT OPTIMIZATION: SHOULD WE INCREASE OR DECREASE TOUCHES FOR THIS SPECIFIC INDUSTRY?",
      "3. PERSONA REFINEMENT: IS THE CURRENT ICP (Ideal Customer Profile) ACCURATE BASED ON RECENT DATA?",
      "4. ANOMALY DETECTION: IDENTIFY IF A PREVIOUSLY SUCCESSFUL TEMPLATE IS NOW UNDERPERFORMING.",
      "",
      "--- CONTEXT ---",
      `HISTORICAL_OUTCOMES: ${JSON.stringify(context.outcomes ?? [])}`,
      `CURRENT_STRATEGY: ${JSON.stringify(context.currentStrategy ?? {})}`,
      `SEGMENT_METRICS: ${JSON.stringify(context.metrics ?? {})}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "data-driven justification for the strategic pivot",',
      '  "alternatives": ["alternative approach if data is noisy"],',
      '  "metadata": {',
      '    "suggestedUpdates": [',
      '      { "component": "sequence" | "scoring" | "composer", "change": "string", "impact": "low" | "medium" | "high" }',
      '    ],',
      '    "newIcpSuggestions": { "industries": [], "titles": [], "size": {} }',
      '  }',
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    return (
      decision.action === AgentAction.UpdateStrategy &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      Array.isArray(payload.suggestedUpdates)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { segment: "SaaS", conversionDrop: 15 },
        output: {
          confidence: 0.92,
          reasoning: "Recent 15% drop in SaaS conversions linked to over-intensive sequences.",
          alternatives: ["Switch to educational nurture"],
          metadata: {
            suggestedUpdates: [
              { component: "sequence", change: "Reduced touches from 6 to 4 for SaaS segment", impact: "high" }
            ],
            newIcpSuggestions: { industries: ["SaaS"], titles: ["CTO"], size: { min: 100 } }
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
