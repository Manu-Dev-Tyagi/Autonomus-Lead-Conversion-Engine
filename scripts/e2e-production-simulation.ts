import "dotenv/config";
import { appContainer } from "@/src/core/infrastructure/ioc/container";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";
import { registerCoreAdapters } from "@/src/core/infrastructure/ioc/registerCoreAdapters";
import { CreateWorkspaceUseCase } from "@/src/core/application/use-cases/CreateWorkspaceUseCase";
import { CreateLeadUseCase } from "@/src/core/application/use-cases/CreateLeadUseCase";
import { OrchestrateLeadLifecycleUseCase } from "@/src/core/application/use-cases/OrchestrateLeadLifecycleUseCase";
import { ExecuteOutreachBookingLoopUseCase } from "@/src/core/application/use-cases/ExecuteOutreachBookingLoopUseCase";
import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { WorkspaceId } from "@/src/core/domain/shared/ids";

async function runProductionSimulation() {
  console.log("🚀 STARTING PRODUCTION E2E SIMULATION...");
  
  // 1. Initialize System
  registerCoreAdapters(appContainer);
  
  const workspaceSlug = `acme-global-${Date.now()}`;
  const ownerUserId = "00000000-0000-0000-0000-000000000001";

  // 2. Provision Workspace
  console.log("\n[1/5] Provisioning Workspace...");
  const createWorkspace = appContainer.resolve<CreateWorkspaceUseCase>(IoCTokens.CreateWorkspaceUseCase);
  const workspaceResult = await createWorkspace.execute({
    idempotencyKey: `init-new-ws-${Date.now()}`,
    name: "Acme Global",
    slug: workspaceSlug,
    ownerUserId,
    industry: "Tech",
  });
  
  // Resolve TenantId from the created workspace
  const workspaceRepo = appContainer.resolve<WorkspaceRepositoryPort>(IoCTokens.WorkspaceRepository);
  const workspace = await workspaceRepo.findById(new WorkspaceId(workspaceResult.workspaceId));
  const tenantId = workspace?.tenantId.value ?? "unknown";
  console.log(`✅ Workspace Created: ${workspaceResult.workspaceId}. TenantId: ${tenantId}`);

  // 3. Lead Intake
  console.log("\n[2/5] Simulating Lead Intake...");
  const createLead = appContainer.resolve<CreateLeadUseCase>(IoCTokens.CreateLead);
  const leadId = await createLead.execute({
    tenantId,
    email: `manu.test.${Date.now()}@example.com`,
  });
  console.log(`✅ Lead Created: ${leadId}`);

  // 4. Lifecycle Orchestration (Enrichment -> Scoring)
  console.log("\n[3/5] Orchestrating Lifecycle (Enrich & Score)...");
  const orchestrateLifecycle = appContainer.resolve<OrchestrateLeadLifecycleUseCase>(IoCTokens.OrchestrateLeadLifecycleUseCase);
  await orchestrateLifecycle.execute({
    tenantId,
    leadId,
    idempotencyKey: `lifecycle-${leadId}`,
  });
  console.log("✅ Lead Enriched and Scored.");

  // 5. Outreach Execution (Plan -> Compose -> Send)
  console.log("\n[4/5] Executing Outreach Loop...");
  const outreachLoop = appContainer.resolve<ExecuteOutreachBookingLoopUseCase>(IoCTokens.ExecuteOutreachBookingLoopUseCase);
  const outreachResult = await outreachLoop.execute({
    tenantId,
    leadId,
    idempotencyKey: `outreach-v1-${leadId}`,
  });
  console.log(`✅ Outreach Status: ${outreachResult.status}`);

  // 6. Simulate Reply & Booking
  console.log("\n[5/5] Simulating Positive Reply & Booking...");
  const bookingResult = await outreachLoop.execute({
    tenantId,
    leadId,
    idempotencyKey: `reply-v1-${leadId}`,
    inboundReplyText: "This sounds amazing! I'd love to chat. Are you free next Tuesday at 2pm?",
  });
  console.log(`✅ Final Status: ${bookingResult.status}`);

  console.log("\n✨ PRODUCTION SIMULATION COMPLETE.");
}

runProductionSimulation().catch((err) => {
  console.error("\n❌ SIMULATION FAILED:");
  console.error(err);
  process.exit(1);
});
