import { describe, expect, it } from "vitest";

import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { IdempotencyPort, IdempotencyResult } from "@/src/core/application/ports/IdempotencyPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { RetryExecutor } from "@/src/core/application/services/RetryExecutor";
import { OrchestrateLeadLifecycleUseCase } from "@/src/core/application/use-cases/OrchestrateLeadLifecycleUseCase";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
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

  async findByEmail(_tenantId: TenantId, _email: string): Promise<Lead | null> {
    return null;
  }
}

class InMemoryEventBus implements EventBusPort {
  readonly events: Array<Record<string, unknown>> = [];

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

class FixedAgentGateway implements AgentGatewayPort {
  calls = 0;
  async execute(action: AgentAction, _context: Record<string, unknown>): Promise<AgentDecision> {
    this.calls += 1;
    if (action === AgentAction.EnrichLead) {
      return {
        action,
        confidence: 0.9,
        reasoning: "Enrichment complete",
        alternatives: [],
        metadata: { provider: "mock" },
      };
    }
    return {
      action,
      confidence: 0.82,
      reasoning: "Strong ICP fit",
      alternatives: ["disqualify"],
      metadata: { model: "mock-scorer" },
    };
  }
}

class InMemoryDecisionRepository implements AgentDecisionRepositoryPort {
  readonly records: Array<Record<string, unknown>> = [];

  async save(input: {
    tenantId: string;
    leadId: string;
    decision: AgentDecision;
    occurredAt: string;
  }): Promise<void> {
    this.records.push(input as Record<string, unknown>);
  }
}

class InMemoryIdempotency implements IdempotencyPort {
  private readonly store = new Map<string, IdempotencyResult>();

  async tryStart(key: string): Promise<{ started: boolean; existingResult?: IdempotencyResult }> {
    if (this.store.has(key)) {
      return { started: false, existingResult: this.store.get(key) };
    }
    return { started: true };
  }

  async complete(key: string, result: IdempotencyResult): Promise<void> {
    this.store.set(key, result);
  }
}

class InMemoryPipelineReadModel implements PipelineReadModelPort {
  readonly records: Array<Record<string, unknown>> = [];

  async upsert(input: {
    tenantId: string;
    leadId: string;
    state: string;
    score: number | null;
    updatedAt: string;
  }): Promise<void> {
    this.records.push(input as Record<string, unknown>);
  }
}

class InMemoryDeadLetterQueue implements DeadLetterQueuePort {
  readonly items: Array<Record<string, unknown>> = [];

  async enqueue(input: {
    tenantId: string;
    leadId: string;
    idempotencyKey: string;
    stage: "enrichment" | "scoring";
    reason: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<void> {
    this.items.push(input);
  }
}

class InMemoryObservability implements ObservabilityPort {
  readonly logs: Array<Record<string, unknown>> = [];
  readonly metrics: Array<Record<string, unknown>> = [];

  info(message: string, data?: Record<string, unknown>): void {
    this.logs.push({ level: "info", message, data: data ?? {} });
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logs.push({ level: "error", message, data: data ?? {} });
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({ name, value, tags: tags ?? {} });
  }
}

class InMemoryTenantOpsMetrics implements TenantOpsMetricsPort {
  successCount = 0;
  failureCount = 0;

  async incrementSuccess(_tenantId: string): Promise<void> {
    this.successCount += 1;
  }
  async incrementFailure(_tenantId: string): Promise<void> {
    this.failureCount += 1;
  }
  async getByTenant(tenantId: string): Promise<{
    tenantId: string;
    successCount: number;
    failureCount: number;
  }> {
    return {
      tenantId,
      successCount: this.successCount,
      failureCount: this.failureCount,
    };
  }
}

describe("OrchestrateLeadLifecycleUseCase", () => {
  it("orchestrates enrich->score->qualify with idempotency", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
    });
    const leadRepository = new InMemoryLeadRepository(lead);
    const eventBus = new InMemoryEventBus();
    const gateway = new FixedAgentGateway();
    const decisions = new InMemoryDecisionRepository();
    const idempotency = new InMemoryIdempotency();
    const readModel = new InMemoryPipelineReadModel();
    const dlq = new InMemoryDeadLetterQueue();
    const observability = new InMemoryObservability();
    const metrics = new InMemoryTenantOpsMetrics();
    const useCase = new OrchestrateLeadLifecycleUseCase(
      leadRepository,
      eventBus,
      gateway,
      decisions,
      idempotency,
      new RetryExecutor(),
      dlq,
      readModel,
      observability,
      metrics,
    );

    const first = await useCase.execute({
      idempotencyKey: "tenant:bbb:lead:aaa:orchestrate-v1",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const replay = await useCase.execute({
      idempotencyKey: "tenant:bbb:lead:aaa:orchestrate-v1",
      tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(first.status).toBe("qualified");
    expect(replay.status).toBe("qualified");
    expect(lead.state).toBe(LeadState.Qualified);
    expect(lead.score).toBe(82);
    expect(gateway.calls).toBe(2);
    expect(decisions.records).toHaveLength(2);
    expect(readModel.records).toHaveLength(1);
    expect(dlq.items).toHaveLength(0);
    expect(observability.metrics).toHaveLength(2);
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(0);
    expect(eventBus.events.map((event) => event.type)).toEqual([
      DomainEventType.LeadEnriched,
      DomainEventType.LeadScored,
      DomainEventType.LeadQualified,
    ]);

    for (const event of eventBus.events) {
      const payload = event.payload as { schemaVersion?: number };
      expect(payload.schemaVersion).toBe(1);
    }
  });

  it("moves failed stage to dead letter queue after retries", async () => {
    const lead = Lead.create({
      id: new LeadId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      tenantId: new TenantId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      email: "lead@example.com",
    });
    const leadRepository = new InMemoryLeadRepository(lead);
    const eventBus = new InMemoryEventBus();
    const decisions = new InMemoryDecisionRepository();
    const idempotency = new InMemoryIdempotency();
    const readModel = new InMemoryPipelineReadModel();
    const dlq = new InMemoryDeadLetterQueue();
    const observability = new InMemoryObservability();
    const metrics = new InMemoryTenantOpsMetrics();
    const failingGateway: AgentGatewayPort = {
      async execute() {
        throw new Error("provider timeout");
      },
    };
    const useCase = new OrchestrateLeadLifecycleUseCase(
      leadRepository,
      eventBus,
      failingGateway,
      decisions,
      idempotency,
      new RetryExecutor(),
      dlq,
      readModel,
      observability,
      metrics,
    );

    await expect(
      useCase.execute({
        idempotencyKey: "tenant:bbb:lead:aaa:orchestrate-v2",
        tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).rejects.toThrowError("Lifecycle orchestration moved to DLQ at enrichment stage.");

    expect(dlq.items).toHaveLength(1);
    expect(readModel.records).toHaveLength(0);
    expect(eventBus.events).toHaveLength(0);
    expect(observability.logs.some((log) => log.level === "error")).toBe(true);
    expect(observability.metrics).toHaveLength(2);
    expect(metrics.successCount).toBe(0);
    expect(metrics.failureCount).toBe(1);
  });
});
