import { describe, expect, it } from "vitest";

import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { CreateLeadUseCase } from "@/src/core/application/use-cases/CreateLeadUseCase";
import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

class InMemoryLeadRepository implements LeadRepositoryPort {
  private readonly leads: Lead[] = [];

  async save(lead: Lead): Promise<void> {
    this.leads.push(lead);
  }

  async findById(tenantId: TenantId, leadId: LeadId): Promise<Lead | null> {
    return (
      this.leads.find((lead) => lead.tenantId.equals(tenantId) && lead.id.equals(leadId)) ?? null
    );
  }

  async findByEmail(tenantId: TenantId, email: string): Promise<Lead | null> {
    return (
      this.leads.find((lead) => lead.tenantId.equals(tenantId) && lead.email === email) ?? null
    );
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

class FixedIdGenerator implements IdGeneratorPort {
  nextUuid(): string {
    return "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  }
}

describe("CreateLeadUseCase", () => {
  it("creates lead and publishes lead.created event", async () => {
    const leadRepository = new InMemoryLeadRepository();
    const eventBus = new InMemoryEventBus();
    const idGenerator = new FixedIdGenerator();
    const useCase = new CreateLeadUseCase(leadRepository, eventBus, idGenerator);

    const leadId = await useCase.execute({
      tenantId: "22222222-2222-4222-8222-222222222222",
      email: "newlead@example.com",
    });

    expect(leadId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(eventBus.events).toHaveLength(1);
    expect(eventBus.events[0]).toMatchObject({
      type: DomainEventType.LeadCreated,
      aggregateId: leadId,
      tenantId: "22222222-2222-4222-8222-222222222222",
    });
  });
});
