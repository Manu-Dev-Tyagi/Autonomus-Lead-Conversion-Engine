import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { ClockPort } from "@/src/core/application/ports/ClockPort";
import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";
import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { ObservabilityPort } from "@/src/core/application/ports/ObservabilityPort";
import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { ConsoleObservabilityAdapter } from "@/src/core/infrastructure/adapters/ConsoleObservabilityAdapter";
import { InMemoryDeadLetterQueueAdapter } from "@/src/core/infrastructure/adapters/InMemoryDeadLetterQueueAdapter";
import { InMemoryPipelineReadModelAdapter } from "@/src/core/infrastructure/adapters/InMemoryPipelineReadModelAdapter";
import { InMemoryTenantOpsMetricsAdapter } from "@/src/core/infrastructure/adapters/InMemoryTenantOpsMetricsAdapter";
import { LlmAgentGatewayAdapter } from "@/src/core/infrastructure/adapters/LlmAgentGatewayAdapter";
import { PostgresLeadRepository } from "@/src/core/infrastructure/adapters/PostgresLeadRepository";
import { QueueEventBusAdapter } from "@/src/core/infrastructure/adapters/QueueEventBusAdapter";
import { SystemClock } from "@/src/core/infrastructure/adapters/SystemClock";
import { UuidGenerator } from "@/src/core/infrastructure/adapters/UuidGenerator";
import { appContainer, Container } from "@/src/core/infrastructure/ioc/container";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";

export function registerCoreAdapters(container: Container = appContainer): void {
  container.register<LeadRepositoryPort>(
    IoCTokens.LeadRepository,
    new PostgresLeadRepository(),
  );
  container.register<EventBusPort>(IoCTokens.EventBus, new QueueEventBusAdapter());
  container.register<AgentGatewayPort>(
    IoCTokens.AgentGateway,
    new LlmAgentGatewayAdapter(),
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
