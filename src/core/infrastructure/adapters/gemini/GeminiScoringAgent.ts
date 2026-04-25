import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiScoringAgent extends BaseGeminiAgent implements AgentGatewayPort {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.ScoreLead,
      parsed,
      "Scoring decision generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE LEAD SCORING & QUALIFICATION AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: CALCULATE A HIGH-PRECISION QUALIFICATION SCORE (0-100) BASED ON ICP FIT AND INTENT.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. ICP ALIGNMENT: HOW WELL DOES THE LEAD MATCH THE IDEAL CUSTOMER PROFILE?",
      "2. INTENT SIGNALS: WEIGHT BEHAVIORAL DATA (visits, downloads, replies) HEAVILY.",
      "3. PATTERN MATCHING: ANALYZE HISTORICAL CONVERSIONS FOR SIMILARITIES.",
      "4. RISK ASSESSMENT: IDENTIFY RED FLAGS (competitors, fake data).",
      "",
      "--- CONTEXT ---",
      `LEAD_DATA: ${JSON.stringify(context.lead ?? {})}`,
      `IDEAL_CUSTOMER_PROFILE: ${JSON.stringify(context.tenantConfig ?? {})}`,
      `HISTORICAL_SUCCESS_PATTERNS: ${JSON.stringify(context.historicalPatterns ?? [])}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "multi-step scoring breakdown",',
      '  "score": integer (0 to 100),',
      '  "breakdown": {',
      '    "firmographicScore": integer,',
      '    "personaScore": integer,',
      '    "intentScore": integer,',
      '    "conversionProbability": float',
      '  },',
      '  "qualitativeAnalysis": "detailed notes on lead quality",',
      '  "metadata": { "qualificationRecommendation": "QUALIFY" | "DISQUALIFY" | "REVIEW" }',
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) {
      return false;
    }
    if (!decision.reasoning.trim()) {
      return false;
    }
    return decision.action === AgentAction.ScoreLead;
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: {
          lead: {
            title: "VP Engineering",
            industry: "SaaS",
            companySize: 180,
            intentSignals: ["pricing_page_visit", "security_question"],
          },
          tenantConfig: {
            industries: ["SaaS", "FinTech"],
            titles: ["CTO", "VP Engineering"],
            companySize: { min: 50, max: 1000 },
          },
        },
        output: {
          confidence: 0.87,
          score: 88,
          reasoning: "Strong ICP alignment and high-intent buyer signals.",
          breakdown: {
            icpFit: 90,
            intentSignals: 85,
            dataQuality: 80,
            timing: 85,
          },
          alternatives: ["QUALIFY_WITH_REVIEW"],
          metadata: { qualificationRecommendation: "QUALIFY" },
        },
      },
    ];
  }
}
