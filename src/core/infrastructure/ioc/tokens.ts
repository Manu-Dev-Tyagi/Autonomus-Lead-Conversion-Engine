export const IoCTokens = {
  LeadRepository: Symbol("LeadRepository"),
  EventBus: Symbol("EventBus"),
  Clock: Symbol("Clock"),
  IdGenerator: Symbol("IdGenerator"),
  AgentGateway: Symbol("AgentGateway"),
  HistoricalOutcomesRead: Symbol("HistoricalOutcomesRead"),
  SequenceLibrary: Symbol("SequenceLibrary"),
  StrategyPerformance: Symbol("StrategyPerformance"),
  ExperimentAssignment: Symbol("ExperimentAssignment"),
  StrategyPlanner: Symbol("StrategyPlanner"),
  PipelineReadModel: Symbol("PipelineReadModel"),
  DeadLetterQueue: Symbol("DeadLetterQueue"),
  Observability: Symbol("Observability"),
  TenantOpsMetrics: Symbol("TenantOpsMetrics"),
} as const;

export type IoCToken = (typeof IoCTokens)[keyof typeof IoCTokens];
