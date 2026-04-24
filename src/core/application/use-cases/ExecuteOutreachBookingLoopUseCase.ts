import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { BookingCoordinatorPort } from "@/src/core/application/ports/BookingCoordinatorPort";
import { ConfidenceGatePort } from "@/src/core/application/ports/ConfidenceGatePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { HumanApprovalPort } from "@/src/core/application/ports/HumanApprovalPort";
import { IdempotencyPort } from "@/src/core/application/ports/IdempotencyPort";
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
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { ResponseIntent } from "@/src/core/domain/interaction/ResponseIntent";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

export interface ExecuteOutreachBookingLoopCommand {
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly leadId: string;
  readonly inboundReplyText?: string;
}

export interface ExecuteOutreachBookingLoopResult {
  readonly status: "outreach_sent" | "booked" | "no_booking" | "pending_approval";
  readonly leadId: string;
}

export class ExecuteOutreachBookingLoopUseCase {
  constructor(
    private readonly leadRepository: LeadRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly idempotency: IdempotencyPort,
    private readonly strategyPlanner: StrategyPlannerPort,
    private readonly composer: MessageComposerPort,
    private readonly timing: SendTimingPort,
    private readonly confidenceGate: ConfidenceGatePort,
    private readonly approvals: HumanApprovalPort,
    private readonly interpreter: ResponseInterpreterPort,
    private readonly booking: BookingCoordinatorPort,
    private readonly interactionTracker: InteractionTrackerPort,
    private readonly policy: PolicyEnginePort,
    private readonly learning: LearningFeedbackPort,
    private readonly kpi: KpiTrackerPort,
    private readonly decisions: AgentDecisionRepositoryPort,
    private readonly observability: ObservabilityPort,
  ) {}

  async execute(
    command: ExecuteOutreachBookingLoopCommand,
  ): Promise<ExecuteOutreachBookingLoopResult> {
    const started = await this.idempotency.tryStart(command.idempotencyKey);
    if (!started.started && started.existingResult) {
      if (
        started.existingResult.status === "outreach_sent" ||
        started.existingResult.status === "booked" ||
        started.existingResult.status === "no_booking" ||
        started.existingResult.status === "pending_approval"
      ) {
        return {
          status: started.existingResult.status,
          leadId: started.existingResult.leadId,
        };
      }
      return {
        status: started.existingResult.status === "qualified" ? "booked" : "no_booking",
        leadId: started.existingResult.leadId,
      };
    }

    const tenantId = new TenantId(command.tenantId);
    const leadId = new LeadId(command.leadId);
    const lead = await this.leadRepository.findById(tenantId, leadId);
    if (!lead) {
      throw new Error("Lead not found for outreach loop.");
    }
    if (lead.state !== LeadState.Qualified && lead.state !== LeadState.Outreach) {
      throw new Error("Lead must be qualified or in outreach state.");
    }

    const plan = await this.strategyPlanner.plan({ tenantId: tenantId.value, leadId: leadId.value });
    await this.saveDecision(tenantId.value, leadId.value, {
      action: AgentAction.PlanSequence,
      confidence: 0.85,
      reasoning: "Selected sequence for qualified lead.",
      alternatives: [],
      metadata: { sequenceId: plan.sequenceId, step: plan.step },
    });

    const message = await this.composer.compose({
      tenantId: tenantId.value,
      leadId: leadId.value,
      sequenceId: plan.sequenceId,
    });
    await this.saveDecision(tenantId.value, leadId.value, {
      action: AgentAction.ComposeMessage,
      confidence: 0.84,
      reasoning: "Composed personalized outreach message.",
      alternatives: [],
      metadata: { subjectLength: message.subject.length },
    });

    const scheduledAt = await this.timing.nextSendAt({
      tenantId: tenantId.value,
      leadId: leadId.value,
    });
    await this.saveDecision(tenantId.value, leadId.value, {
      action: AgentAction.OptimizeTiming,
      confidence: 0.8,
      reasoning: "Selected next optimal send window.",
      alternatives: [],
      metadata: { scheduledAt },
    });
    await this.saveDecision(tenantId.value, leadId.value, {
      action: AgentAction.SendEmail,
      confidence: 0.84,
      reasoning: "Prepared outbound send action after policy checks.",
      alternatives: [],
      metadata: { sequenceId: plan.sequenceId, scheduledAt },
    });

    const sendConfidence = 0.84;
    await this.policy.assertAllowed({
      tenantId: tenantId.value,
      leadId: leadId.value,
      action: AgentAction.SendEmail,
      confidence: sendConfidence,
    });
    const requiresSendApproval = await this.confidenceGate.requiresApproval({
      tenantId: tenantId.value,
      action: AgentAction.SendEmail,
      confidence: sendConfidence,
    });
    if (requiresSendApproval) {
      await this.approvals.request({
        tenantId: tenantId.value,
        leadId: leadId.value,
        action: AgentAction.SendEmail,
        confidence: sendConfidence,
        reason: "Confidence below configured threshold for autonomous send.",
        payload: {
          subject: message.subject,
          body: message.body,
          scheduledAt,
        },
      });
      await this.idempotency.complete(command.idempotencyKey, {
        status: "disqualified",
        leadId: lead.id.value,
        score: lead.score ?? 0,
      });
      return { status: "pending_approval", leadId: lead.id.value };
    }

    if (lead.state === LeadState.Qualified) {
      lead.transitionTo(LeadState.Outreach);
    }
    await this.interactionTracker.record({
      tenantId: tenantId.value,
      leadId: leadId.value,
      type: "email",
      payload: {
        sequenceId: plan.sequenceId,
        sequenceStep: plan.step,
        subject: message.subject,
        body: message.body,
        scheduledAt,
      },
      occurredAt: new Date().toISOString(),
    });
    await this.kpi.increment({ tenantId: tenantId.value, metric: "outreach_sent" });
    await this.kpi.increment({ tenantId: tenantId.value, metric: "reply_rate_denominator" });
    await this.eventBus.publish({
      type: DomainEventType.InteractionRecorded,
      aggregateId: leadId.value,
      tenantId: tenantId.value,
      occurredAt: new Date().toISOString(),
      payload: { schemaVersion: 1, type: "email", sequenceId: plan.sequenceId },
    });

    let result: ExecuteOutreachBookingLoopResult = {
      status: "outreach_sent",
      leadId: lead.id.value,
    };

    if (command.inboundReplyText) {
      const intent = await this.interpreter.interpret({
        tenantId: tenantId.value,
        leadId: leadId.value,
        inboundText: command.inboundReplyText,
      });
      await this.saveDecision(tenantId.value, leadId.value, {
        action: AgentAction.InterpretResponse,
        confidence: 0.8,
        reasoning: "Classified inbound response intent.",
        alternatives: [],
        metadata: { intent },
      });

      await this.interactionTracker.record({
        tenantId: tenantId.value,
        leadId: leadId.value,
        type: "reply",
        payload: { intent, text: command.inboundReplyText },
        occurredAt: new Date().toISOString(),
      });
      await this.kpi.increment({ tenantId: tenantId.value, metric: "reply_received" });
      await this.kpi.increment({ tenantId: tenantId.value, metric: "reply_rate_numerator" });

      if (intent === ResponseIntent.Positive) {
        lead.transitionTo(LeadState.Replied);
        await this.kpi.increment({ tenantId: tenantId.value, metric: "booking_rate_denominator" });
        await this.saveDecision(tenantId.value, leadId.value, {
          action: AgentAction.ScheduleMeeting,
          confidence: 0.82,
          reasoning: "Prepared booking action for positive reply.",
          alternatives: [],
          metadata: { inboundReplyText: command.inboundReplyText },
        });
        const bookingConfidence = 0.82;
        await this.policy.assertAllowed({
          tenantId: tenantId.value,
          leadId: leadId.value,
          action: AgentAction.ScheduleMeeting,
          confidence: bookingConfidence,
        });
        const requiresBookingApproval = await this.confidenceGate.requiresApproval({
          tenantId: tenantId.value,
          action: AgentAction.ScheduleMeeting,
          confidence: bookingConfidence,
        });
        if (requiresBookingApproval) {
          await this.approvals.request({
            tenantId: tenantId.value,
            leadId: leadId.value,
            action: AgentAction.ScheduleMeeting,
            confidence: bookingConfidence,
            reason: "Confidence below configured threshold for autonomous booking.",
            payload: {
              inboundReplyText: command.inboundReplyText,
            },
          });
          result = { status: "pending_approval", leadId: lead.id.value };
        } else {
        const bookingResult = await this.booking.book({
          tenantId: tenantId.value,
          leadId: leadId.value,
        });
        if (bookingResult.booked) {
          lead.transitionTo(LeadState.Booked);
          await this.interactionTracker.record({
            tenantId: tenantId.value,
            leadId: leadId.value,
            type: "meeting",
            payload: { meetingId: bookingResult.meetingId ?? "unknown" },
            occurredAt: new Date().toISOString(),
          });
          await this.kpi.increment({ tenantId: tenantId.value, metric: "meeting_booked" });
          await this.kpi.increment({ tenantId: tenantId.value, metric: "booking_rate_numerator" });
          await this.kpi.increment({
            tenantId: tenantId.value,
            metric: "time_to_book_seconds",
            value: Math.max(
              0,
              Math.floor((Date.now() - new Date(scheduledAt).getTime()) / 1000),
            ),
          });
          await this.kpi.increment({
            tenantId: tenantId.value,
            metric: "show_up_projection_score",
            value: 72,
          });
          await this.learning.capture({
            tenantId: tenantId.value,
            leadId: leadId.value,
            signal: "positive_reply_booked",
            payload: { meetingId: bookingResult.meetingId ?? null },
          });
          result = { status: "booked", leadId: lead.id.value };
        } else {
          await this.learning.capture({
            tenantId: tenantId.value,
            leadId: leadId.value,
            signal: "positive_reply_no_slot",
            payload: {},
          });
          result = { status: "no_booking", leadId: lead.id.value };
        }
        }
      } else {
        await this.learning.capture({
          tenantId: tenantId.value,
          leadId: leadId.value,
          signal: "non_positive_reply",
          payload: { intent },
        });
        result = { status: "no_booking", leadId: lead.id.value };
      }
    }

    await this.leadRepository.save(lead);
    await this.idempotency.complete(command.idempotencyKey, {
      status: result.status,
      leadId: result.leadId,
      score: lead.score ?? 0,
    });
    this.observability.metric("outreach_booking_loop_completed", 1, {
      tenantId: tenantId.value,
      status: result.status,
    });
    return result;
  }

  private async saveDecision(
    tenantId: string,
    leadId: string,
    decision: AgentDecision,
  ): Promise<void> {
    await this.decisions.save({
      tenantId,
      leadId,
      decision,
      occurredAt: new Date().toISOString(),
    });
  }
}
