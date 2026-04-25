import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiComposerAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.ComposeMessage,
      parsed,
      "Composed message generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE AN ELITE DIRECT-RESPONSE COPYWRITER SPECIALIZING IN B2B OUTREACH.",
      "MISSION: COMPOSE A HYPER-PERSONALIZED, HIGH-CONVERSION EMAIL THAT FEELS HUMAN AND SOLVES A REAL PROBLEM.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. PERSONALIZATION: USE SPECIFIC DETAILS FROM THE LEAD'S TITLE, COMPANY, OR RECENT NEWS.",
      "2. VALUE-FIRST: DON'T SELL. PROVIDE AN INSIGHT OR A SOLUTION TO A LIKELY PAIN POINT.",
      "3. BREVITY: GET TO THE POINT IN < 100 WORDS.",
      "4. CTA: USE A 'LOW-FRICTION' CALL TO ACTION (e.g., 'Open to a quick chat?' vs 'Book 30 mins').",
      "5. TONE: PROFESSIONAL YET APPROACHABLE. NO SPAMMY JARGON.",
      "",
      "--- CONTEXT ---",
      `LEAD: ${JSON.stringify(context.lead ?? {})}`,
      `ENRICHMENT_SIGNALS: ${JSON.stringify(context.enrichment ?? {})}`,
      `TEMPLATE_DIRECTION: ${JSON.stringify(context.strategy ?? {})}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "copywriting logic and personalization strategy",',
      '  "alternatives": ["shorter_subject_line", "different_opener"],',
      '  "metadata": {',
      '    "subject": "compelling subject line",',
      '    "emailBody": "full email text with placeholders removed",',
      '    "ctaPresent": true,',
      '    "personalizationDepth": "low" | "medium" | "high"',
      "  }",
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const subject = payload.subject;
    const emailBody = payload.emailBody;
    const ctaPresent = payload.ctaPresent;
    return (
      decision.action === AgentAction.ComposeMessage &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof subject === "string" &&
      subject.length > 0 &&
      typeof emailBody === "string" &&
      emailBody.length > 0 &&
      typeof ctaPresent === "boolean"
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { leadName: "Alex", company: "Acme", tone: "professional" },
        output: {
          confidence: 0.86,
          reasoning: "Personalized opener and single CTA increase response probability.",
          alternatives: ["short_variant"],
          metadata: {
            subject: "Quick idea for Acme growth",
            emailBody: "Hi Alex ... open to a 15-min call next week?",
            ctaPresent: true,
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
