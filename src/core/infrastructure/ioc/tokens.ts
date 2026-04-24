export const IoCTokens = {
  LeadRepository: Symbol("LeadRepository"),
  EventBus: Symbol("EventBus"),
  Clock: Symbol("Clock"),
  IdGenerator: Symbol("IdGenerator"),
  AgentGateway: Symbol("AgentGateway"),
  PipelineReadModel: Symbol("PipelineReadModel"),
  DeadLetterQueue: Symbol("DeadLetterQueue"),
  Observability: Symbol("Observability"),
  TenantOpsMetrics: Symbol("TenantOpsMetrics"),
} as const;

export type IoCToken = (typeof IoCTokens)[keyof typeof IoCTokens];
