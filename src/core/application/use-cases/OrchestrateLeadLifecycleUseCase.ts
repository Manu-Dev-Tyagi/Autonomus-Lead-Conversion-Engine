import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import {
  AgentContextByAction,
  LifecycleAgentGatewayPort,
} from "@/src/core/application/ports/AgentGatewayPort";
import {
  assertActionOwner,
  LifecycleAgentActions,
} from "@/src/core/application/ports/AgentActionScopes";
import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { IdempotencyPort, IdempotencyResult } from "@/src/core/application/ports/IdempotencyPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { RetryExecutor } from "@/src/core/application/services/RetryExecutor";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

const QUALIFICATION_THRESHOLD = 70;

export interface OrchestrateLeadLifecycleCommand {
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly leadId: string;
}

export class OrchestrateLeadLifecycleUseCase {
  constructor(
    private readonly leadRepository: LeadRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly agentGateway: LifecycleAgentGatewayPort,
    private readonly decisionRepository: AgentDecisionRepositoryPort,
    private readonly idempotency: IdempotencyPort,
    private readonly retryExecutor: RetryExecutor,
    private readonly deadLetterQueue: DeadLetterQueuePort,
    private readonly pipelineReadModel: PipelineReadModelPort,
    private readonly observability: ObservabilityPort,
    private readonly tenantOpsMetrics: TenantOpsMetricsPort,
  ) {
    assertActionOwner(AgentAction.EnrichLead, "lifecycle");
    assertActionOwner(AgentAction.ScoreLead, "lifecycle");
  }

  async execute(command: OrchestrateLeadLifecycleCommand): Promise<IdempotencyResult> {
    const startedAtMs = Date.now();
    const tenantId = new TenantId(command.tenantId);
    const idempotent = await this.idempotency.tryStart(command.idempotencyKey);
    if (!idempotent.started && idempotent.existingResult) {
      return idempotent.existingResult;
    }

    try {
      const leadId = new LeadId(command.leadId);
      this.observability.info("orchestration_started", {
        tenantId: tenantId.value,
        leadId: leadId.value,
        idempotencyKey: command.idempotencyKey,
      });
      const lead = await this.leadRepository.findById(tenantId, leadId);
      if (!lead) {
        throw new Error("Lead not found for orchestration.");
      }

      lead.transitionTo(LeadState.Enriching);
      const enrichmentDecision = await this.runAgentWithRetry({
        stage: "enrichment",
        action: AgentAction.EnrichLead,
        tenantId: tenantId.value,
        leadId: leadId.value,
        idempotencyKey: command.idempotencyKey,
        context: {
          tenantId: tenantId.value,
          leadId: leadId.value,
          email: lead.email,
        },
      });
      await this.decisionRepository.save({
        tenantId: tenantId.value,
        leadId: leadId.value,
        decision: enrichmentDecision,
        occurredAt: new Date().toISOString(),
      });
      lead.transitionTo(LeadState.Enriched);
      await this.eventBus.publish({
        type: DomainEventType.LeadEnriched,
        aggregateId: leadId.value,
        tenantId: tenantId.value,
        occurredAt: new Date().toISOString(),
        payload: { schemaVersion: 1, confidence: enrichmentDecision.confidence },
      });

      lead.transitionTo(LeadState.Scoring);
      const scoringDecision = await this.runAgentWithRetry({
        stage: "scoring",
        action: AgentAction.ScoreLead,
        tenantId: tenantId.value,
        leadId: leadId.value,
        idempotencyKey: command.idempotencyKey,
        context: {
          tenantId: tenantId.value,
          leadId: leadId.value,
          email: lead.email,
        },
      });
      await this.decisionRepository.save({
        tenantId: tenantId.value,
        leadId: leadId.value,
        decision: scoringDecision,
        occurredAt: new Date().toISOString(),
      });

      const score = Math.round(((scoringDecision.metadata as any).score ?? (scoringDecision.confidence * 100)));
      lead.updateScore(score);
      
      const blendedConfidence = scoringDecision.confidence;
      const qualifyScore = Number(process.env.ALE_THRESHOLD_QUALIFY_SCORE ?? 70);
      const qualifyConf = Number(process.env.ALE_THRESHOLD_QUALIFY_CONFIDENCE ?? 0.72);
      const reviewScoreMin = Number(process.env.ALE_THRESHOLD_REVIEW_SCORE_MIN ?? 50);
      const reviewConfMin = Number(process.env.ALE_THRESHOLD_REVIEW_CONFIDENCE_MIN ?? 0.55);
      const escalateConf = Number(process.env.ALE_THRESHOLD_AUTO_ESCALATE_CONFIDENCE ?? 0.45);

      let finalStatus: string = "disqualified";

      if (blendedConfidence < escalateConf) {
        lead.transitionTo(LeadState.Escalated);
        finalStatus = "escalated";
      } else if (score >= qualifyScore && blendedConfidence >= qualifyConf) {
        lead.transitionTo(LeadState.Qualified);
        finalStatus = "qualified";
      } else if (score >= reviewScoreMin || blendedConfidence >= reviewConfMin) {
        lead.transitionTo(LeadState.Review);
        finalStatus = "review";
      } else {
        lead.transitionTo(LeadState.Disqualified);
        finalStatus = "disqualified";
      }

      await this.eventBus.publish({
        type: DomainEventType.LeadScored,
        aggregateId: leadId.value,
        tenantId: tenantId.value,
        occurredAt: new Date().toISOString(),
        payload: { schemaVersion: 1, score, confidence: blendedConfidence, status: finalStatus },
      });

      if (finalStatus === "qualified") {
        await this.eventBus.publish({
          type: DomainEventType.LeadQualified,
          aggregateId: leadId.value,
          tenantId: tenantId.value,
          occurredAt: new Date().toISOString(),
          payload: { schemaVersion: 1, score },
        });
      }

      await this.leadRepository.save(lead);
      await this.pipelineReadModel.upsert({
        tenantId: tenantId.value,
        leadId: leadId.value,
        state: lead.state,
        score: lead.score,
        updatedAt: new Date().toISOString(),
      });
      const result: IdempotencyResult = { status: finalStatus as any, leadId: lead.id.value, score };
      await this.idempotency.complete(command.idempotencyKey, result);
      await this.tenantOpsMetrics.incrementSuccess(tenantId.value);
      this.observability.metric("lifecycle_orchestration_completed", 1, {
        tenantId: tenantId.value,
        status: finalStatus,
      });
      this.observability.metric(
        "lifecycle_orchestration_latency_ms",
        Date.now() - startedAtMs,
        { tenantId: tenantId.value },
      );
      return result;
    } catch (error) {
      await this.tenantOpsMetrics.incrementFailure(tenantId.value);
      this.observability.metric("lifecycle_orchestration_failed", 1, {
        tenantId: tenantId.value,
      });
      this.observability.metric(
        "lifecycle_orchestration_latency_ms",
        Date.now() - startedAtMs,
        { tenantId: tenantId.value, status: "failed" },
      );
      throw error;
    }
  }

  private async runAgentWithRetry(input: {
    stage: "enrichment" | "scoring";
    action: LifecycleAgentActions;
    tenantId: string;
    leadId: string;
    idempotencyKey: string;
    context: AgentContextByAction[LifecycleAgentActions] & Record<string, unknown>;
  }) {
    try {
      return await this.retryExecutor.run(
        () => this.agentGateway.execute(input.action, input.context),
        {
          maxAttempts: 3,
          baseDelayMs: 15,
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown agent error";
      this.observability.error("agent_stage_failed", {
        stage: input.stage,
        tenantId: input.tenantId,
        leadId: input.leadId,
        reason,
      });
      await this.deadLetterQueue.enqueue({
        tenantId: input.tenantId,
        leadId: input.leadId,
        idempotencyKey: input.idempotencyKey,
        stage: input.stage,
        reason,
        payload: input.context,
        occurredAt: new Date().toISOString(),
      });
      throw new Error(`Lifecycle orchestration moved to DLQ at ${input.stage} stage.`);
    }
  }
}
