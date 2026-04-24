import { describe, expect, it } from "vitest";

import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { BookingCoordinatorPort } from "@/src/core/application/ports/BookingCoordinatorPort";
import { ConfidenceGatePort } from "@/src/core/application/ports/ConfidenceGatePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { HumanApprovalPort } from "@/src/core/application/ports/HumanApprovalPort";
import { IdempotencyPort, IdempotencyResult } from "@/src/core/application/ports/IdempotencyPort";
import { InteractionTrackerPort } from "@/src/core/application/ports/InteractionTrackerPort";
import { KpiTrackerPort } from "@/src/core/application/ports/KpiTrackerPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { LearningFeedbackPort } from "@/src/core/application/ports/LearningFeedbackPort";
import { MessageComposerPort } from "@/src/core/application/ports/MessageComposerPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PolicyEnginePort } from "@/src/core/application/ports/PolicyEnginePort";
import { ResponseInterpreterPort } from "@/src/core/application/ports/ResponseInterpreterPort";
import { SendTimingPort } from "@/src/core/application/ports/SendTimingPort";
import { StrategyPlannerPort } from "@/src/core/application/ports/StrategyPlannerPort";
import { ExecuteOutreachBookingLoopUseCase } from "@/src/core/application/use-cases/ExecuteOutreachBookingLoopUseCase";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

class InMemoryLeadRepository implements LeadRepositoryPort {
  constructor(private readonly lead: Lead) {}
  async save(lead: Lead): Promise<void> {
    this.lead.state = lead.state;
    this.lead.score = lead.score;
  }
  async findById(tenantId: TenantId, leadId: LeadId): Promise<Lead | null> {
    if (!this.lead.tenantId.equals(tenantId) || !this.lead.id.equals(leadId)) {
      return null;
    }
    return this.lead;
  }
  async findByEmail(): Promise<Lead | null> {
    return null;
  }
}

class InMemoryEventBus implements EventBusPort {
  events: Array<Record<string, unknown>> = [];
  async publish<TPayload>(event: {
    type: string;
    aggregateId: string;
    tenantId: string;
    occurredAt: string;
    payload: TPayload;
  }): Promise<void> {
    this.events.push(event as Record<string, unknown>);
  }
}

class InMemoryIdempotency implements IdempotencyPort {
  private readonly map = new Map<string, IdempotencyResult>();
  async tryStart(key: string): Promise<{ started: boolean; existingResult?: IdempotencyResult }> {
    if (this.map.has(key)) {
      return { started: false, existingResult: this.map.get(key) };
    }
    return { started: true };
  }
  async complete(key: string, result: IdempotencyResult): Promise<void> {
    this.map.set(key, result);
  }
}

const strategyPlanner: StrategyPlannerPort = {
  async plan() {
    return { sequenceId: "seq-1", step: 1, channel: "email" };
  },
};
const composer: MessageComposerPort = {
  async compose() {
    return { subject: "Hello", body: "Can we talk?" };
  },
};
const timing: SendTimingPort = {
  async nextSendAt() {
    return new Date().toISOString();
  },
};
const confidenceGateNoApproval: ConfidenceGatePort = {
  async requiresApproval() {
    return false;
  },
};
const approvals: HumanApprovalPort = {
  async request() {},
};
const interpreterPositive: ResponseInterpreterPort = {
  async interpret() {
    return ResponseIntent.Positive;
  },
};
const interpreterNeutral: ResponseInterpreterPort = {
  async interpret() {
    return ResponseIntent.Neutral;
  },
};
const bookingYes: BookingCoordinatorPort = {
  async book() {
    return { booked: true, meetingId: "m-1" };
  },
};
const bookingNo: BookingCoordinatorPort = {
  async book() {
    return { booked: false };
  },
};
const interactionTracker: InteractionTrackerPort = {
  async record() {},
};
const policyEngine: PolicyEnginePort = {
  async assertAllowed() {},
};
const learning: LearningFeedbackPort = {
  async capture() {},
};
const kpi: KpiTrackerPort = {
  async increment() {},
};
const decisions: AgentDecisionRepositoryPort = {
  async save(_input: {
    tenantId: string;
    leadId: string;
    decision: AgentDecision;
    occurredAt: string;
  }) {},
};
const obs: ObservabilityPort = {
  info() {},
  error() {},
  metric() {},
};

describe("ExecuteOutreachBookingLoopUseCase", () => {
  it("books meeting for positive reply", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGateNoApproval,
      approvals,
      interpreterPositive,
      bookingYes,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-1",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      inboundReplyText: "Yes, interested",
    });

    expect(result.status).toBe("booked");
    expect(lead.state).toBe(LeadState.Booked);
  });

  it("sends outreach when no inbound reply exists", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGateNoApproval,
      approvals,
      interpreterPositive,
      bookingYes,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-2",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(result.status).toBe("outreach_sent");
    expect(lead.state).toBe(LeadState.Outreach);
  });

  it("returns pending approval when confidence gate blocks send action", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    let approvalRequested = false;
    const confidenceGate: ConfidenceGatePort = {
      async requiresApproval() {
        return true;
      },
    };
    const approvalPort: HumanApprovalPort = {
      async request() {
        approvalRequested = true;
      },
    };
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGate,
      approvalPort,
      interpreterPositive,
      bookingYes,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-3",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(result.status).toBe("pending_approval");
    expect(approvalRequested).toBe(true);
    expect(lead.state).toBe(LeadState.Qualified);
  });

  it("returns no_booking for neutral reply", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGateNoApproval,
      approvals,
      interpreterNeutral,
      bookingYes,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-4",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      inboundReplyText: "Maybe later",
    });

    expect(result.status).toBe("no_booking");
    expect(lead.state).toBe(LeadState.Outreach);
  });

  it("returns no_booking when booking cannot secure a slot", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGateNoApproval,
      approvals,
      interpreterPositive,
      bookingNo,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-5",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      inboundReplyText: "Sure, send times",
    });

    expect(result.status).toBe("no_booking");
    expect(lead.state).toBe(LeadState.Replied);
  });

  it("returns pending approval when gate blocks booking action", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
      state: LeadState.Qualified,
      score: 90,
    });
    const confidenceGate: ConfidenceGatePort = {
      async requiresApproval(input) {
        return input.action === "SCHEDULE_MEETING";
      },
    };
    const useCase = new ExecuteOutreachBookingLoopUseCase(
      new InMemoryLeadRepository(lead),
      new InMemoryEventBus(),
      new InMemoryIdempotency(),
      strategyPlanner,
      composer,
      timing,
      confidenceGate,
      approvals,
      interpreterPositive,
      bookingYes,
      interactionTracker,
      policyEngine,
      learning,
      kpi,
      decisions,
      obs,
    );

    const result = await useCase.execute({
      idempotencyKey: "phase3-loop-6",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      inboundReplyText: "Please book me",
    });

    expect(result.status).toBe("pending_approval");
    expect(lead.state).toBe(LeadState.Replied);
  });
});
