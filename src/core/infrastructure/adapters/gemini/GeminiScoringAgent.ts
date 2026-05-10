import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";
import { RAGContextBuilder } from "@/src/core/infrastructure/rag/RAGContextBuilder";

export class GeminiScoringAgent extends BaseGeminiAgent {
  constructor(
    apiKey: string,
    model: string | undefined,
    generationConfig: any,
    private readonly ragContextBuilder: RAGContextBuilder
  ) {
    super(apiKey, model, generationConfig);
  }

  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const lead = context.lead as any;
    const tenantId = context.tenantId as string;
    
    // Build RAG context
    const ragContext = this.ragContextBuilder 
      ? await this.ragContextBuilder.buildContext(lead, tenantId)
      : { similarLeads: [] };
    
    const parsed = await this.callGemini({
      ...context,
      ragContext,
    });

    return this.normalizeDecision(
      AgentAction.ScoreLead,
      parsed,
      "Scoring decision generated with RAG-enhanced reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    const lead = context.lead as any;
    const icp = context.tenantConfig as any;
    const ragContext = context.ragContext as any;

    return `
═══════════════════════════════════════════════════════════════
🎯 LEAD SCORING AGENT - PRODUCTION SYSTEM
═══════════════════════════════════════════════════════════════

MISSION: Calculate precise qualification score (0-100) for B2B lead

📊 LEAD PROFILE:
Email: ${lead.email}
Industry: ${lead.enrichmentData?.company?.industry || "Unknown"}
Company Size: ${lead.enrichmentData?.company?.employees || "Unknown"}
Title: ${lead.enrichmentData?.person?.title || "Unknown"}

🎯 IDEAL CUSTOMER PROFILE (ICP):
Target Industries: ${JSON.stringify(icp?.industries || [])}
Target Company Size: ${JSON.stringify(icp?.companySize || {})}
Target Titles: ${JSON.stringify(icp?.titles || [])}

📈 HISTORICAL CONTEXT (RAG):
Similar Past Leads Found: ${ragContext?.similarLeads?.length || 0}
${(ragContext?.similarLeads || []).map((l: any, i: number) => `
${i + 1}. ${l.lead.enrichmentData?.company?.name} - ${l.lead.enrichmentData?.person?.title}
   Similarity: ${(l.similarity * 100).toFixed(1)}%
   Outcome: ${l.outcome}
`).join("\n")}

📋 SCORING METHODOLOGY (Total 100 points):
1. ICP FIT (40 pts): 
   - Industry match (15 pts: exact=15, adjacent=8, outside=0)
   - Company size (15 pts: within range=15, ±50%=8, outside=0)
   - Title/seniority (10 pts: decision-maker=10, influencer=6, IC=2)
2. INTENT SIGNALS (30 pts): 
   - Company growth/funding/hiring (10 pts)
   - Tech stack fit (10 pts)
   - Engagement history (10 pts: pricing=10, blog=6, homepage=3)
3. DATA QUALITY (20 pts): 
   - Profile completeness (10 pts: >80%=10, 50-80%=6, <50%=2)
   - Source confidence (10 pts: verified=10, inferred=5)
4. TIMING (10 pts): 
   - Recency of signal (5 pts: <7d=5, 7-30d=3, >30d=1)
   - Fiscal cycle fit (5 pts: Q1/Q4 budget season=5, Q2/Q3=3)

OUTPUT FORMAT (JSON):
{
  "score": integer (0-100),
  "confidence": float (0.0-1.0),
  "reasoning": "detailed explanation",
  "breakdown": {
    "icpFit": integer,
    "intentSignals": integer,
    "dataQuality": integer,
    "timing": integer
  },
  "metadata": { "qualificationRecommendation": "QUALIFY" | "DISQUALIFY" | "REVIEW" }
}
`;
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const metadata = decision.metadata as any;
    const innerMetadata = metadata.metadata || {};
    return (
      decision.action === AgentAction.ScoreLead &&
      typeof metadata.score === "number" &&
      ["QUALIFY", "DISQUALIFY", "REVIEW"].includes(innerMetadata.qualificationRecommendation)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: {
          lead: { email: "test@example.com" },
          ragContext: { similarLeads: [{ outcome: "converted", similarity: 0.9 }] }
        },
        output: {
          score: 85,
          confidence: 0.9,
          reasoning: "Strong similarity to previously converted lead.",
          breakdown: { icpFit: 35, intentSignals: 25, dataQuality: 15, timing: 10 },
          metadata: { qualificationRecommendation: "QUALIFY" }
        }
      }
    ];
  }
}

