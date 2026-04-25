import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { BookingCoordinatorPort, BookingResult } from "@/src/core/application/ports/BookingCoordinatorPort";
import { ConfidenceGatePort } from "@/src/core/application/ports/ConfidenceGatePort";
import { HumanApprovalPort } from "@/src/core/application/ports/HumanApprovalPort";
import { IdempotencyPort, IdempotencyResult } from "@/src/core/application/ports/IdempotencyPort";
import { InteractionTrackerPort } from "@/src/core/application/ports/InteractionTrackerPort";
import { KpiTrackerPort } from "@/src/core/application/ports/KpiTrackerPort";
import { LearningFeedbackPort } from "@/src/core/application/ports/LearningFeedbackPort";
import { PolicyEnginePort } from "@/src/core/application/ports/PolicyEnginePort";
import { CalendarPort } from "@/src/core/application/ports/CalendarPort";

export class InMemoryDecisionRepository implements AgentDecisionRepositoryPort {
  async save(input: { tenantId: string; leadId: string; decision: any; occurredAt: string }): Promise<void> {
    console.log(`[DecisionSaved] ${input.decision.action}: ${input.decision.reasoning}`);
  }
}

export class InMemoryIdempotencyAdapter implements IdempotencyPort {
  private readonly store = new Map<string, IdempotencyResult>();
  private readonly inProgress = new Set<string>();

  async tryStart(key: string): Promise<{ started: boolean; existingResult?: IdempotencyResult }> {
    if (this.store.has(key)) return { started: false, existingResult: this.store.get(key) };
    if (this.inProgress.has(key)) return { started: false };
    this.inProgress.add(key);
    return { started: true };
  }

  async complete(key: string, result: IdempotencyResult): Promise<void> {
    this.store.set(key, result);
    this.inProgress.delete(key);
  }
}

export class InMemoryConfidenceGateAdapter implements ConfidenceGatePort {
  async requiresApproval(input: { tenantId: string; action: string; confidence: number }): Promise<boolean> {
    return input.confidence < 0.7;
  }
}

export class InMemoryHumanApprovalAdapter implements HumanApprovalPort {
  async request(req: any): Promise<void> {
    console.log(`[ApprovalRequested] Action: ${req.action}, Reason: ${req.reason}`);
  }
}

export class InMemoryInteractionTracker implements InteractionTrackerPort {
  async record(log: any): Promise<void> {
    console.log(`[InteractionRecorded] Type: ${log.type}`);
  }
}

export class InMemoryPolicyEngine implements PolicyEnginePort {
  async assertAllowed(): Promise<void> {
    return Promise.resolve();
  }
}

export class InMemoryLearningFeedback implements LearningFeedbackPort {
  async capture(feedback: any): Promise<void> {
    console.log(`[LearningCaptured] Signal: ${feedback.signal}`);
  }
}

export class InMemoryKpiTracker implements KpiTrackerPort {
  async increment(input: { metric: string; value?: number }): Promise<void> {
    console.log(`[KpiIncrement] ${input.metric}: ${input.value ?? 1}`);
  }
}

export class BookingCoordinatorAdapter implements BookingCoordinatorPort {
  constructor(private readonly calendar: CalendarPort) {}
  async book(input: { tenantId: string; leadId: string }): Promise<BookingResult> {
    const slots = await this.calendar.getAvailableSlots(input.leadId, new Date(), new Date());
    if (slots.length > 0) {
      const event = await this.calendar.createEvent(input.leadId, {
        summary: "ALE Meeting",
        description: "Autonomous meeting booking",
        start: slots[0].start,
        end: slots[0].end,
        attendeeEmail: "manu.test@example.com"
      });
      return { booked: true, meetingId: event.eventId };
    }
    return { booked: false };
  }
}
