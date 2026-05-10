import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiTimingAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.OptimizeTiming,
      parsed,
      "Timing decision generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE OUTREACH TIMING OPTIMIZOR FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: CALCULATE THE HIGHEST-PROBABILITY SEND TIME BASED ON TIMEZONE, ROLE, AND HISTORICAL ENGAGEMENT.",
      "",
      "--- ALLOWED SEND WINDOWS (RECIPIENT LOCAL TIME) ---",
      "Tue-Thu: 8:00 AM - 10:00 AM (Primary), 2:00 PM - 4:00 PM (Secondary)",
      "Mon: 10:00 AM - 12:00 PM",
      "Fri: 8:00 AM - 10:00 AM",
      "",
      "--- HARD BLOCKS (NEVER SEND) ---",
      "Saturday & Sunday: All day.",
      "Monday: 6:00 AM - 9:00 AM (email burial).",
      "Friday: After 12:00 PM (mental checkout).",
      "Public Holidays: Check recipient country.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. TIMEZONE AWARENESS: Priority - Enriched location > Company HQ > Domain TLD.",
      "2. FATIGUE SPACING: Min 72 hours between emails. Min 7 days between sequences.",
      "3. ADAPTIVE: If they opened at 9:15 AM before, bias future sends toward that window.",
      "",
      "--- CONTEXT ---",
      `LEAD_PROFILE: ${JSON.stringify(context.lead ?? {})}`,
      `LEAD_TIMEZONE: ${context.timezone || "UTC"}`,
      `CURRENT_TIME_UTC: ${new Date().toISOString()}`,
      `HISTORICAL_ENGAGEMENTS: ${JSON.stringify(context.history ?? [])}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "logic for selecting this specific window",',
      '  "alternatives": ["ISO_TIMESTAMP_UTC"],',
      '  "metadata": {',
      '    "scheduledAt": "ISO_TIMESTAMP_UTC",',
      '    "timezone": "IANA_TimeZone_ID",',
      '    "localTime": "readable local time",',
      '    "isNextDay": boolean',
      "  }",
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const scheduledAt = payload.scheduledAt;
    const timezone = payload.timezone;
    return (
      decision.action === AgentAction.OptimizeTiming &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof scheduledAt === "string" &&
      scheduledAt.length > 0 &&
      typeof timezone === "string" &&
      timezone.length > 0
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { timezone: "America/New_York", role: "CTO" },
        output: {
          confidence: 0.79,
          reasoning: "Historical data suggests highest open rates at 10:00 local time.",
          alternatives: ["2026-04-27T15:00:00Z"],
          metadata: { scheduledAt: "2026-04-27T14:00:00Z", timezone: "America/New_York" },
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
