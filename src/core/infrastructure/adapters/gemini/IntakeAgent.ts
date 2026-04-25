import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiIntakeAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.CreateLead,
      parsed,
      "Lead intake normalization generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE LEAD INTAKE SPECIALIST AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: NORMALIZE RAW LEAD DATA INTO A STANDARDIZED FORMAT AND IDENTIFY MISSING CRITICAL DATA.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. ACCURACY: ONLY USE DATA PROVIDED. DO NOT HALLUCINATE EMAILS.",
      "2. NORMALIZATION: ENSURE PROPER CAPITALIZATION (First Names, Company Names).",
      "3. SEGMENTATION: IDENTIFY IF THIS IS AN INBOUND (contact form) OR OUTBOUND (manual) LEAD.",
      "4. VALIDATION: EXTRACT EMAIL, NAME, COMPANY, TITLE, AND LINKEDIN IF PRESENT.",
      "",
      "--- CONTEXT ---",
      `RAW_INPUT: ${JSON.stringify(context.rawInput ?? context)}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "string explanation",',
      '  "alternatives": ["string[]"],',
      '  "metadata": {',
      '    "normalizedLead": { "firstName", "lastName", "email", "company", "title", "linkedin", "source" },',
      '    "missingFields": ["string[]"],',
      '    "priority": "low" | "medium" | "high"',
      "  }",
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const normalizedLead = payload.normalizedLead;
    const missingFields = payload.missingFields;
    return (
      decision.action === AgentAction.CreateLead &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof normalizedLead === "object" &&
      normalizedLead !== null &&
      Array.isArray(missingFields)
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { email: "alex.smith@acme.inc", name: "ALEX SMITH", source: "form_v1" },
        output: {
          confidence: 0.98,
          reasoning: "Normalized name and identified missing title/company.",
          alternatives: [],
          metadata: {
            normalizedLead: {
              firstName: "Alex",
              lastName: "Smith",
              email: "alex.smith@acme.inc",
              source: "form_v1",
            },
            missingFields: ["company", "title"],
            priority: "medium",
          },
        },
      },
      {
        input: { raw: "Found john doe from google on twitter. jdoe@google.com" },
        output: {
          confidence: 0.95,
          reasoning: "Extracted information from unstructured string.",
          alternatives: ["Check if twitter handle should be archived"],
          metadata: {
            normalizedLead: {
              firstName: "John",
              lastName: "Doe",
              email: "jdoe@google.com",
              company: "Google",
              source: "manual_search",
            },
            missingFields: ["title"],
            priority: "high",
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
