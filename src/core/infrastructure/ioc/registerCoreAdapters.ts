import { AgentGatewayPort, LifecycleAgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
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
import { PostgresProvisioningJobRepository } from "@/src/core/infrastructure/adapters/PostgresProvisioningJobRepository";
import { PostgresTenantRepository } from "@/src/core/infrastructure/adapters/PostgresTenantRepository";
import { PostgresWorkspaceConfigRepository } from "@/src/core/infrastructure/adapters/PostgresWorkspaceConfigRepository";
import { PostgresWorkspaceRepository } from "@/src/core/infrastructure/adapters/PostgresWorkspaceRepository";
import { QueueEventBusAdapter } from "@/src/core/infrastructure/adapters/QueueEventBusAdapter";
import { AwsSqsEventBusAdapter } from "@/src/core/infrastructure/adapters/AwsSqsEventBusAdapter";
import { SendGridEmailAdapter } from "@/src/core/infrastructure/adapters/SendGridEmailAdapter";
import { GoogleCalendarAdapter } from "@/src/core/infrastructure/adapters/GoogleCalendarAdapter";
import { DeterministicExperimentAssignmentAdapter } from "@/src/core/infrastructure/adapters/strategy/DeterministicExperimentAssignmentAdapter";
import { InMemorySequenceLibraryAdapter } from "@/src/core/infrastructure/adapters/strategy/InMemorySequenceLibraryAdapter";
import { InMemoryStrategyPerformanceAdapter } from "@/src/core/infrastructure/adapters/strategy/InMemoryStrategyPerformanceAdapter";
import { StrategyPlannerAdapter } from "@/src/core/infrastructure/adapters/strategy/StrategyPlannerAdapter";
import { SystemClock } from "@/src/core/infrastructure/adapters/SystemClock";
import { UuidGenerator } from "@/src/core/infrastructure/adapters/UuidGenerator";
import { appContainer, Container } from "@/src/core/infrastructure/ioc/container";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";
import { EmailDeliveryPort } from "@/src/core/application/ports/EmailDeliveryPort";
import { CalendarPort } from "@/src/core/application/ports/CalendarPort";
import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { WorkspaceConfigPort } from "@/src/core/application/ports/WorkspaceConfigPort";
import { ProvisioningJobPort } from "@/src/core/application/ports/ProvisioningJobPort";
import { TenantRepositoryPort } from "@/src/core/application/ports/TenantRepositoryPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { CreateLeadUseCase } from "@/src/core/application/use-cases/CreateLeadUseCase";
import { CreateWorkspaceUseCase } from "@/src/core/application/use-cases/CreateWorkspaceUseCase";
import { OrchestrateLeadLifecycleUseCase } from "@/src/core/application/use-cases/OrchestrateLeadLifecycleUseCase";
import { ExecuteOutreachBookingLoopUseCase } from "@/src/core/application/use-cases/ExecuteOutreachBookingLoopUseCase";
import { RetryExecutor } from "@/src/core/application/services/RetryExecutor";
import { ResponseInterpreterAdapter } from "@/src/core/infrastructure/adapters/ResponseInterpreterAdapter";
import { TemplateDrivenComposerAdapter } from "@/src/core/infrastructure/adapters/templates/TemplateDrivenComposerAdapter";
import { TemplateLibraryAdapter } from "@/src/core/infrastructure/adapters/templates/TemplateLibraryAdapter";
import { TemplatePerformanceTracker } from "@/src/core/infrastructure/adapters/templates/TemplatePerformanceTracker";
import { 
  InMemoryDecisionRepository, 
  InMemoryIdempotencyAdapter, 
  InMemoryConfidenceGateAdapter, 
  InMemoryHumanApprovalAdapter, 
  InMemoryInteractionTracker, 
  InMemoryPolicyEngine, 
  InMemoryLearningFeedback, 
  InMemoryKpiTracker,
  BookingCoordinatorAdapter
} from "@/src/core/infrastructure/adapters/InMemorySimulationAdapters";
import { 
  InMemoryLeadRepository, 
  InMemoryProvisioningJobRepository, 
  InMemoryWorkspaceConfigRepository, 
  InMemoryWorkspaceRepository 
} from "@/src/core/infrastructure/adapters/InMemoryStorageAdapters";
import { AgentDecisionRepositoryPort } from "@/src/core/application/ports/AgentDecisionRepositoryPort";
import { IdempotencyPort } from "@/src/core/application/ports/IdempotencyPort";
import { ConfidenceGatePort } from "@/src/core/application/ports/ConfidenceGatePort";
import { HumanApprovalPort } from "@/src/core/application/ports/HumanApprovalPort";
import { InteractionTrackerPort } from "@/src/core/application/ports/InteractionTrackerPort";
import { PolicyEnginePort } from "@/src/core/application/ports/PolicyEnginePort";
import { LearningFeedbackPort } from "@/src/core/application/ports/LearningFeedbackPort";
import { KpiTrackerPort } from "@/src/core/application/ports/KpiTrackerPort";
import { BookingCoordinatorPort } from "@/src/core/application/ports/BookingCoordinatorPort";
import { ResponseInterpreterPort } from "@/src/core/application/ports/ResponseInterpreterPort";
import { MessageComposerPort } from "@/src/core/application/ports/MessageComposerPort";
import { TemplateLibraryPort } from "@/src/core/application/ports/TemplateLibraryPort";
import { TemplatePerformancePort } from "@/src/core/application/ports/TemplatePerformancePort";
import { SendTimingPort } from "@/src/core/application/ports/SendTimingPort";

export function registerCoreAdapters(container: Container = appContainer): void {
  const historicalOutcomesReader = buildHistoricalOutcomesReader();
  const dbConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Infrastructure
  container.register<ClockPort>(IoCTokens.Clock, new SystemClock());
  container.register<IdGeneratorPort>(IoCTokens.IdGenerator, new UuidGenerator());
  container.register<ObservabilityPort>(IoCTokens.Observability, new ConsoleObservabilityAdapter());
  
  const eventBus = process.env.AWS_SQS_QUEUE_URL 
    ? new AwsSqsEventBusAdapter() 
    : new QueueEventBusAdapter();
  container.register<EventBusPort>(IoCTokens.EventBus, eventBus);

  const emailDelivery = process.env.SENDGRID_API_KEY
    ? new SendGridEmailAdapter()
    : { sendEmail: async () => ({ messageId: "dev-stub" }) };
  container.register<EmailDeliveryPort>(IoCTokens.EmailDelivery, emailDelivery as EmailDeliveryPort);

  container.register<CalendarPort>(IoCTokens.Calendar, new GoogleCalendarAdapter());

  // Storage fallbacks ensure simulation/tests can run without a live DB
  container.register<LeadRepositoryPort>(
      IoCTokens.LeadRepository, 
      dbConfigured ? new PostgresLeadRepository() : new InMemoryLeadRepository()
  );
  container.register<WorkspaceRepositoryPort>(
      IoCTokens.WorkspaceRepository, 
      dbConfigured ? new PostgresWorkspaceRepository() : new InMemoryWorkspaceRepository()
  );
  container.register<WorkspaceConfigPort>(
      IoCTokens.WorkspaceConfig, 
      dbConfigured ? new PostgresWorkspaceConfigRepository() : new InMemoryWorkspaceConfigRepository()
  );
  container.register<ProvisioningJobPort>(
      IoCTokens.ProvisioningJob, 
      dbConfigured ? new PostgresProvisioningJobRepository() : new InMemoryProvisioningJobRepository()
  );
  container.register<TenantRepositoryPort>(
      IoCTokens.TenantRepository, 
      dbConfigured ? new PostgresTenantRepository() : { 
        save: async () => {}, 
        findById: async () => null,
        addMembership: async () => {}
      } as any
  );

  container.register<HistoricalOutcomesReadPort>(IoCTokens.HistoricalOutcomesRead, historicalOutcomesReader);
  container.register<PipelineReadModelPort>(IoCTokens.PipelineReadModel, new InMemoryPipelineReadModelAdapter());
  container.register<DeadLetterQueuePort>(IoCTokens.DeadLetterQueue, new InMemoryDeadLetterQueueAdapter());
  container.register<TenantOpsMetricsPort>(IoCTokens.TenantOpsMetrics, new InMemoryTenantOpsMetricsAdapter());

  // Strategy & Experimentation
  const sequenceLibrary = new InMemorySequenceLibraryAdapter();
  const strategyPerformance = new InMemoryStrategyPerformanceAdapter();
  const experimentAssignment = new DeterministicExperimentAssignmentAdapter();
  container.register<SequenceLibraryPort>(IoCTokens.SequenceLibrary, sequenceLibrary);
  container.register<StrategyPerformancePort>(IoCTokens.StrategyPerformance, strategyPerformance);
  container.register<ExperimentAssignmentPort>(IoCTokens.ExperimentAssignment, experimentAssignment);

  // Agent Gateway
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const agentGateway = hasGeminiKey 
    ? new LlmAgentGatewayAdapter({ historicalOutcomesReader })
    : new (require("@/src/core/infrastructure/adapters/MockAgentGateway").MockAgentGateway)();
  
  container.register<AgentGatewayPort>(IoCTokens.AgentGateway, agentGateway);
  
  // High-Level Adapters
  container.register<StrategyPlannerPort>(
    IoCTokens.StrategyPlanner,
    new StrategyPlannerAdapter(sequenceLibrary, strategyPerformance, experimentAssignment, agentGateway)
  );

  const idempotency = new InMemoryIdempotencyAdapter();
  const decisions = new InMemoryDecisionRepository();
  const confidenceGate = new InMemoryConfidenceGateAdapter();
  const humanApproval = new InMemoryHumanApprovalAdapter();
  const interactionTracker = new InMemoryInteractionTracker();
  const policyEngine = new InMemoryPolicyEngine();
  const learningFeedback = new InMemoryLearningFeedback();
  const kpiTracker = new InMemoryKpiTracker();
  const booking = new BookingCoordinatorAdapter(container.resolve<CalendarPort>(IoCTokens.Calendar));
  const retryExecutor = new RetryExecutor();

  container.register<IdempotencyPort>(IoCTokens.Idempotency, idempotency);
  container.register<AgentDecisionRepositoryPort>(IoCTokens.Decisions, decisions);
  container.register<ConfidenceGatePort>(IoCTokens.ConfidenceGate, confidenceGate);
  container.register<HumanApprovalPort>(IoCTokens.HumanApproval, humanApproval);
  container.register<InteractionTrackerPort>(IoCTokens.InteractionTracker, interactionTracker);
  container.register<PolicyEnginePort>(IoCTokens.Policy, policyEngine);
  container.register<LearningFeedbackPort>(IoCTokens.Learning, learningFeedback);
  container.register<KpiTrackerPort>(IoCTokens.Kpi, kpiTracker);
  container.register<BookingCoordinatorPort>(IoCTokens.Booking, booking);

  // Specialized Activity Adapters - Safely handle Mock vs Real gateway
  const responseAgent = (agentGateway as any).agents?.get(AgentAction.InterpretResponse) ?? agentGateway;
  const composerAgent = (agentGateway as any).agents?.get(AgentAction.ComposeMessage) ?? agentGateway;
  
  const interpreter = new ResponseInterpreterAdapter(responseAgent);
  const templateRepo = new (require("@/src/core/infrastructure/adapters/templates/TemplateRepository").TemplateRepository)();
  const templateLibrary = new TemplateLibraryAdapter(
    templateRepo,
    new TemplatePerformanceTracker(templateRepo)
  );
  const composer = new TemplateDrivenComposerAdapter(composerAgent);
  
  container.register<ResponseInterpreterPort>(IoCTokens.Interpreter, interpreter);
  container.register<TemplateLibraryPort>(IoCTokens.TemplateLibrary, templateLibrary);
  container.register<TemplatePerformancePort>(IoCTokens.TemplatePerformance, templateLibrary);
  container.register<MessageComposerPort>(IoCTokens.MessageComposer, composer);
  container.register<SendTimingPort>(IoCTokens.SendTiming, {
    nextSendAt: async () => new Date(Date.now() + 3600000).toISOString()
  });

  // Use Cases
  container.register<CreateWorkspaceUseCase>(
    IoCTokens.CreateWorkspaceUseCase,
    new CreateWorkspaceUseCase(
      container.resolve(IoCTokens.WorkspaceRepository),
      container.resolve(IoCTokens.WorkspaceConfig),
      container.resolve(IoCTokens.ProvisioningJob),
      container.resolve(IoCTokens.TenantRepository),
      container.resolve(IoCTokens.IdGenerator)
    )
  );

  container.register<CreateLeadUseCase>(
    IoCTokens.CreateLead,
    new CreateLeadUseCase(
      container.resolve(IoCTokens.LeadRepository),
      container.resolve(IoCTokens.EventBus),
      container.resolve(IoCTokens.IdGenerator)
    )
  );

  container.register<OrchestrateLeadLifecycleUseCase>(
    IoCTokens.OrchestrateLeadLifecycleUseCase,
    new OrchestrateLeadLifecycleUseCase(
      container.resolve(IoCTokens.LeadRepository),
      container.resolve(IoCTokens.EventBus),
      agentGateway as any,
      decisions,
      idempotency,
      retryExecutor,
      container.resolve(IoCTokens.DeadLetterQueue),
      container.resolve(IoCTokens.PipelineReadModel),
      container.resolve(IoCTokens.Observability),
      container.resolve(IoCTokens.TenantOpsMetrics)
    )
  );

  container.register<ExecuteOutreachBookingLoopUseCase>(
    IoCTokens.ExecuteOutreachBookingLoopUseCase,
    new ExecuteOutreachBookingLoopUseCase(
      container.resolve(IoCTokens.LeadRepository),
      container.resolve(IoCTokens.EventBus),
      idempotency,
      container.resolve(IoCTokens.StrategyPlanner),
      templateLibrary,
      templateLibrary, // Performance port
      composer,
      container.resolve(IoCTokens.SendTiming),
      confidenceGate,
      humanApproval,
      interpreter,
      booking,
      interactionTracker,
      policyEngine,
      learningFeedback,
      kpiTracker,
      decisions,
      container.resolve(IoCTokens.Observability),
      container.resolve(IoCTokens.EmailDelivery)
    )
  );
}

function buildHistoricalOutcomesReader(): HistoricalOutcomesReadPort {
  if (process.env.ALE_SCORING_USE_POSTGRES_OUTCOMES === "true") {
    return new PostgresHistoricalOutcomesReadAdapter();
  }
  const adapter = new InMemoryHistoricalOutcomesReadAdapter();
  const seed = process.env.ALE_SCORING_HISTORICAL_SEED;
  if (!seed) return adapter;
  try {
    const parsed = JSON.parse(seed);
    for (const item of parsed) adapter.upsert(item);
  } catch {}
  return adapter;
}
