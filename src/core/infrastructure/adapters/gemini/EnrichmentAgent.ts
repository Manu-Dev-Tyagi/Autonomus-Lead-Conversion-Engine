import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiEnrichmentAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.EnrichLead,
      parsed,
      "Enrichment output generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE ENRICHMENT INTELLIGENCE AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: DEEP-DIVE INTO LEAD AND COMPANY DATA TO INFER MISSING SIGNALS AND IDENTIFY PAIN POINTS.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. FIRMOGRAPHICS: EXTRACT OR INFER INDUSTRY, SIZE, TECHNOLOGY STACK, AND GEOGRAPHY.",
      "2. PERSONA: IDENTIFY DECISION-MAKER LEVEL (C-Suite, VP, Manager) AND DEPARTMENT.",
      "3. PAIN POINTS: BASED ON THE TITLE AND COMPANY TYPE, WHAT ARE THEIR LIKELY STRUGGLES?",
      "4. INTENT SIGNALS: IF WEB SCRAPING DATA IS PROVIDED, FIND HIRING TRENDS OR NEWS.",
      "",
      "--- CONTEXT ---",
      `LEAD_DATA: ${JSON.stringify(context.lead ?? {})}`,
      `COMPANY_DATA: ${JSON.stringify(context.company ?? {})}`,
      `SCRAPE_RESULTS: ${JSON.stringify(context.scraping ?? {})}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "multi-step inference logic",',
      '  "alternatives": ["alternative industry or persona"],',
      '  "metadata": {',
      '    "enrichedFields": { "industry", "size", "techStack", "decisionMakerLevel", "department", "estimatedRevenue" },',
      '    "missingSignals": ["signals that couldn\'t be verified"],',
      '    "intentScore": 0.0 to 1.0,',
      '    "painPoints": ["list", "of", "likely", "pains"]',
      "  }",
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const enrichedFields = payload.enrichedFields;
    const missingSignals = payload.missingSignals;
    return (
      decision.action === AgentAction.EnrichLead &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof enrichedFields === "object" &&
      enrichedFields !== null &&
      Array.isArray(missingSignals)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { company: "Stripe", title: "Engineering Manager" },
        output: {
          confidence: 0.95,
          reasoning: "Verified Tier-1 Fintech company. Persona is mid-level engineering management.",
          alternatives: [],
          metadata: {
            enrichedFields: {
              industry: "Fintech / Payments",
              size: "1000+",
              techStack: ["Ruby", "Go", "AWS"],
              decisionMakerLevel: "Manager",
              department: "Engineering",
            },
            missingSignals: ["current_hiring_budget"],
            intentScore: 0.7,
            painPoints: ["developer productivity", "payment compliance scale"],
          },
        },
      },
      {
        input: { company: "Local Bakery", title: "Owner" },
        output: {
          confidence: 0.85,
          reasoning: "SMB category. Basic profile inferred from common bakery models.",
          alternatives: ["Check if they have multiple locations"],
          metadata: {
            enrichedFields: {
              industry: "Food & Beverage",
              size: "1-10",
              decisionMakerLevel: "Owner",
              department: "Executive",
            },
            missingSignals: ["technology_adoption"],
            intentScore: 0.3,
            painPoints: ["local foot traffic", "inventory costs"],
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
