import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { BaseGeminiAgent, FewShotExample } from "@/src/core/infrastructure/adapters/gemini/BaseGeminiAgent";

export class GeminiBookingAgent extends BaseGeminiAgent {
  async execute(_: AgentAction, context: Record<string, unknown>): Promise<AgentDecision> {
    const parsed = await this.callGemini(context);
    return this.normalizeDecision(
      AgentAction.ScheduleMeeting,
      parsed,
      "Booking decision generated with fallback reasoning.",
    );
  }

  protected buildPrompt(context: Record<string, unknown>): string {
    return [
      "YOU ARE THE CALENDAR CONCIERGE AGENT FOR THE AUTONOMOUS LEAD ENGINE (ALE).",
      "MISSION: NEGOTIATE AND CONCLUDE MEETING BOOKINGS BY SELECTING OPTIMAL SLOTS BASED ON AVAILABILITY AND LEAD PREFERENCE.",
      "",
      "--- CORE PRINCIPLES ---",
      "1. SLOT SELECTION: MATCH THE LEAD'S MENTIONED TIME DRIVEN BY THE RESPONSE AGENT'S EXTRACTION.",
      "2. AVAILABILITY: ONLY SELECT FROM THE PROVIDED 'AVAILABLE_SLOTS'.",
      "3. BUFFER: ENSURE AT LEAST 15 MINS BETWEEN MEETINGS IF POSSIBLE.",
      "4. ATTENDEES: INCLUDE THE APPROPRIATE SALESPERSON (AE) BASED ON THE WORKSPACE CONFIG.",
      "",
      "--- CONTEXT ---",
      `LEAD_PREFERENCE: ${JSON.stringify(context.leadPreference ?? {})}`,
      `AVAILABLE_SLOTS: ${JSON.stringify(context.availableSlots ?? [])}`,
      `WORKSPACE_CALENDAR_CONFIG: ${JSON.stringify(context.calendarConfig ?? {})}`,
      "",
      "--- OUTPUT JSON FORMAT ---",
      "{",
      '  "confidence": float (0.0 to 1.0),',
      '  "reasoning": "negotiation logic and slot selection criteria",',
      '  "alternatives": ["ISO_TIMESTAMP_UTC"],',
      '  "metadata": {',
      '    "slot": "ISO_TIMESTAMP_UTC",',
      '    "durationMinutes": 15 | 30 | 45 | 60,',
      '    "meetingType": "intro" | "demo" | "technical",',
      '    "assignedAe": "ae_id_or_name"',
      "  }",
      "}",
    ].join("\n");
  }

  protected validateDecision(decision: AgentDecision): boolean {
    const payload = this.getPayload(decision.metadata);
    const slot = payload.slot;
    const durationMinutes = payload.durationMinutes;
    return (
      decision.action === AgentAction.ScheduleMeeting &&
      Number.isFinite(decision.confidence) &&
      decision.confidence >= 0 &&
      decision.confidence <= 1 &&
      decision.reasoning.trim().length > 0 &&
      typeof slot === "string" &&
      slot.length > 0 &&
      typeof durationMinutes === "number" &&
      durationMinutes > 0 &&
      durationMinutes <= 240
    );
  }

  protected getFewShotExamples(): FewShotExample[] {
    return [
      {
        input: { proposedSlots: ["2026-04-27T14:00:00Z"] },
        output: {
          confidence: 0.81,
          reasoning: "Selected earliest mutually available slot.",
          alternatives: ["2026-04-27T15:00:00Z"],
          metadata: { slot: "2026-04-27T14:00:00Z", durationMinutes: 30 },
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
