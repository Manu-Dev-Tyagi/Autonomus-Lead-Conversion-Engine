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
    const leadData = context.lead ?? context;
    const icp = context.tenantConfig ?? {};
    const historical = context.historicalPatterns ?? [];
    return [
      "Analyze this lead for qualification.",
      `Lead Data: ${JSON.stringify(leadData)}`,
      `Our ICP: ${JSON.stringify(icp)}`,
      `Historical successful conversions: ${JSON.stringify(historical)}`,
      "Task:",
      "1. Rate ICP fit (0-100)",
      "2. Identify intent signals",
      "3. Predict conversion likelihood",
      "4. Explain reasoning in 1-2 sentences",
      "Output JSON with: confidence, reasoning, score, breakdown, alternatives, metadata",
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
