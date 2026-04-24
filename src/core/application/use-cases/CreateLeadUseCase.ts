import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

export interface CreateLeadCommand {
  readonly tenantId: string;
  readonly email: string;
}

export class CreateLeadUseCase {
  constructor(
    private readonly leadRepository: LeadRepositoryPort,
    private readonly eventBus: EventBusPort,
    private readonly idGenerator: IdGeneratorPort,
  ) {}

  async execute(command: CreateLeadCommand): Promise<string> {
    const tenantId = new TenantId(command.tenantId);

    const existingLead = await this.leadRepository.findByEmail(tenantId, command.email);
    if (existingLead) {
      throw new Error("Lead with email already exists in tenant.");
    }

    const leadId = new LeadId(this.idGenerator.nextUuid());
    const lead = Lead.create({
      id: leadId,
      tenantId,
      email: command.email,
    });

    await this.leadRepository.save(lead);
    await this.eventBus.publish({
      type: DomainEventType.LeadCreated,
      aggregateId: lead.id.value,
      tenantId: tenantId.value,
      occurredAt: new Date().toISOString(),
      payload: {
        email: lead.email,
        state: lead.state,
      },
    });

    return lead.id.value;
  }
}
