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
      "Compose a personalized outreach email for this lead.",
      `Context: ${JSON.stringify(context)}`,
      "Constraints:",
      "- Keep body <= 150 words",
      "- Include exactly one CTA",
      "- Avoid spammy claims",
      "Output JSON with: confidence, reasoning, alternatives, metadata { subject, emailBody, ctaPresent }",
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
