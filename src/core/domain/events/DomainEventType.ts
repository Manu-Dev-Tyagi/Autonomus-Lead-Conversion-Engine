export enum DomainEventType {
  LeadCreated = "lead.created",
  LeadEnriched = "lead.enriched",
  LeadScored = "lead.scored",
  LeadQualified = "lead.qualified",
  LeadDisqualified = "lead.disqualified",
  InteractionRecorded = "interaction.recorded",
}

export interface DomainEvent<TPayload> {
  type: DomainEventType;
  aggregateId: string;
  tenantId: string;
  occurredAt: string;
  payload: TPayload;
}
