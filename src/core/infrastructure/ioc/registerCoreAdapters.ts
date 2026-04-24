import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { ClockPort } from "@/src/core/application/ports/ClockPort";
import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { ExperimentAssignmentPort } from "@/src/core/application/ports/ExperimentAssignmentPort";
import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";
import { SequenceLibraryPort } from "@/src/core/application/ports/SequenceLibraryPort";
import { StrategyPerformancePort } from "@/src/core/application/ports/StrategyPerformancePort";
import { StrategyPlannerPort } from "@/src/core/application/ports/StrategyPlannerPort";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { ConsoleObservabilityAdapter } from "@/src/core/infrastructure/adapters/ConsoleObservabilityAdapter";
import { InMemoryDeadLetterQueueAdapter } from "@/src/core/infrastructure/adapters/InMemoryDeadLetterQueueAdapter";
import { InMemoryHistoricalOutcomesReadAdapter } from "@/src/core/infrastructure/adapters/InMemoryHistoricalOutcomesReadAdapter";
import { InMemoryPipelineReadModelAdapter } from "@/src/core/infrastructure/adapters/InMemoryPipelineReadModelAdapter";
import { InMemoryTenantOpsMetricsAdapter } from "@/src/core/infrastructure/adapters/InMemoryTenantOpsMetricsAdapter";
import { LlmAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/LlmAgentGatewayAdapter";
import { PostgresHistoricalOutcomesReadAdapter } from "@/src/core/infrastructure/adapters/PostgresHistoricalOutcomesReadAdapter";
import { PostgresLeadRepository } from "@/src/core/infrastructure/adapters/PostgresLeadRepository";
import { QueueEventBusAdapter } from "@/src/core/infrastructure/adapters/QueueEventBusAdapter";
import { DeterministicExperimentAssignmentAdapter } from "@/src/core/infrastructure/adapters/strategy/DeterministicExperimentAssignmentAdapter";
import { InMemorySequenceLibraryAdapter } from "@/src/core/infrastructure/adapters/strategy/InMemorySequenceLibraryAdapter";
import { InMemoryStrategyPerformanceAdapter } from "@/src/core/infrastructure/adapters/strategy/InMemoryStrategyPerformanceAdapter";
import { StrategyPlannerAdapter } from "@/src/core/infrastructure/adapters/strategy/StrategyPlannerAdapter";
import { SystemClock } from "@/src/core/infrastructure/adapters/SystemClock";
import { UuidGenerator } from "@/src/core/infrastructure/adapters/UuidGenerator";
import { appContainer, Container } from "@/src/core/infrastructure/ioc/container";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";

export function registerCoreAdapters(container: Container = appContainer): void {
  const historicalOutcomesReader = buildHistoricalOutcomesReader();
  container.register<LeadRepositoryPort>(
    IoCTokens.LeadRepository,
    new PostgresLeadRepository(),
  );
  container.register<HistoricalOutcomesReadPort>(
    IoCTokens.HistoricalOutcomesRead,
    historicalOutcomesReader,
  );
  const sequenceLibrary = new InMemorySequenceLibraryAdapter();
  const strategyPerformance = new InMemoryStrategyPerformanceAdapter();
  const experimentAssignment = new DeterministicExperimentAssignmentAdapter();
  container.register<SequenceLibraryPort>(IoCTokens.SequenceLibrary, sequenceLibrary);
  container.register<StrategyPerformancePort>(IoCTokens.StrategyPerformance, strategyPerformance);
  container.register<ExperimentAssignmentPort>(IoCTokens.ExperimentAssignment, experimentAssignment);
  container.register<EventBusPort>(IoCTokens.EventBus, new QueueEventBusAdapter());
  const agentGateway = new LlmAgentGatewayAdapter({ historicalOutcomesReader });
  container.register<AgentGatewayPort>(
    IoCTokens.AgentGateway,
    agentGateway,
  );
  container.register<StrategyPlannerPort>(
    IoCTokens.StrategyPlanner,
    new StrategyPlannerAdapter(
      sequenceLibrary,
      strategyPerformance,
      experimentAssignment,
      agentGateway,
    ),
  );
  container.register<PipelineReadModelPort>(
    IoCTokens.PipelineReadModel,
    new InMemoryPipelineReadModelAdapter(),
  );
  container.register<DeadLetterQueuePort>(
    IoCTokens.DeadLetterQueue,
    new InMemoryDeadLetterQueueAdapter(),
  );
  container.register<ObservabilityPort>(
    IoCTokens.Observability,
    new ConsoleObservabilityAdapter(),
  );
  container.register<TenantOpsMetricsPort>(
    IoCTokens.TenantOpsMetrics,
    new InMemoryTenantOpsMetricsAdapter(),
  );
  container.register<ClockPort>(IoCTokens.Clock, new SystemClock());
  container.register<IdGeneratorPort>(IoCTokens.IdGenerator, new UuidGenerator());
}

function buildHistoricalOutcomesReader(): HistoricalOutcomesReadPort {
  if (process.env.ALE_SCORING_USE_POSTGRES_OUTCOMES === "true") {
    return new PostgresHistoricalOutcomesReadAdapter();
  }
  const adapter = new InMemoryHistoricalOutcomesReadAdapter();
  const seed = process.env.ALE_SCORING_HISTORICAL_SEED;
  if (!seed) {
    return adapter;
  }
  try {
    const parsed = JSON.parse(seed) as Array<{
      tenantId: string;
      segmentKey: string;
      conversionRate: number;
    }>;
    for (const item of parsed) {
      adapter.upsert(item);
    }
  } catch {
    // Ignore malformed seed values and continue with defaults.
  }
  return adapter;
}
