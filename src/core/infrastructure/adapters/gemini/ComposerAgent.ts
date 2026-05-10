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
      "1. PERSONALIZATION: Tiered approach (Tier 1: Name/Company, Tier 2: Pain points/Size, Tier 3: Events/Competitors).",
      "2. QUALITY: Word count 75-120 words. No all-caps. Exactly ONE CTA.",
      "3. SPAM PREVENTION: Max 1 exclamation mark. No images. Max 2 links.",
      "4. TONE: Follow tenant tone (casual/professional/technical).",
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
    const subject = String(payload.subject || "");
    const emailBody = String(payload.emailBody || "");
    const ctaCount = Number(payload.ctaCount || 0);
    const wordCount = emailBody.split(/\s+/).length;
    const subjectWordCount = subject.split(/\s+/).length;

    return (
      decision.action === AgentAction.ComposeMessage &&
      decision.confidence >= 0.72 &&
      wordCount >= 50 && wordCount <= 150 &&
      subjectWordCount >= 3 && subjectWordCount <= 10 &&
      ctaCount === 1 &&
      (!emailBody.includes("!") || emailBody.split("!").length <= 2)
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
