import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { WorkspaceConfigPort } from "@/src/core/application/ports/WorkspaceConfigPort";
import { ProvisioningJobPort } from "@/src/core/application/ports/ProvisioningJobPort";
import { TenantRepositoryPort } from "@/src/core/application/ports/TenantRepositoryPort";
import { IdGeneratorPort } from "@/src/core/application/ports/IdGeneratorPort";
import { Workspace } from "@/src/core/domain/workspace/Workspace";
import { WorkspaceConfig } from "@/src/core/domain/workspace/WorkspaceConfig";
import { ProvisioningJob, ProvisioningStatus } from "@/src/core/domain/workspace/ProvisioningJob";
import { Tenant } from "@/src/core/domain/shared/Tenant";
import { TenantId, WorkspaceId, WorkspaceConfigId, ProvisioningJobId } from "@/src/core/domain/shared/ids";
import { WorkspaceStatus } from "@/src/core/domain/workspace/WorkspaceStatus";

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  ownerUserId: string;
  idempotencyKey: string;
  industry?: string;
  companySize?: string;
  templateConfig?: Record<string, any>;
}

export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    private readonly configRepo: WorkspaceConfigPort,
    private readonly jobRepo: ProvisioningJobPort,
    private readonly tenantRepo: TenantRepositoryPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(input: CreateWorkspaceInput): Promise<{ workspaceId: string; jobId: string }> {
    // 1. Idempotency check
    const existingJob = await this.jobRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existingJob) {
      return { 
        workspaceId: existingJob.workspaceId.value, 
        jobId: existingJob.id.value 
      };
    }

    // 2. Prepare IDs
    const tenantId = new TenantId(this.idGenerator.nextUuid());
    const workspaceId = new WorkspaceId(this.idGenerator.nextUuid());
    const jobId = new ProvisioningJobId(this.idGenerator.nextUuid());
    const configId = new WorkspaceConfigId(this.idGenerator.nextUuid());

    // 3. Start Job
    const job = ProvisioningJob.create({
      id: jobId,
      workspaceId: workspaceId,
      idempotencyKey: input.idempotencyKey,
      status: ProvisioningStatus.Running,
      step: "starting_provisioning"
    });
    await this.jobRepo.save(job);

    try {
      // 4. Create Tenant
      const tenant = Tenant.create({
        id: tenantId,
        name: input.name,
        slug: input.slug,
        config: {
          owner_id: input.ownerUserId,
          created_at: new Date().toISOString()
        }
      });
      await this.tenantRepo.save(tenant);

      // 5. Create Workspace
      const workspace = Workspace.create({
        id: workspaceId,
        tenantId: tenantId,
        name: input.name,
        slug: input.slug,
        ownerUserId: input.ownerUserId,
        industry: input.industry,
        companySize: input.companySize,
        status: WorkspaceStatus.Active // Sync provisioning for now
      });
      await this.workspaceRepo.save(workspace);

      // 6. Create Owner Membership
      await this.tenantRepo.addMembership(tenantId, input.ownerUserId, "owner");

      // 7. Create Config
      const config = WorkspaceConfig.create({
        id: configId,
        workspaceId: workspaceId,
        version: 1,
        config: input.templateConfig ?? {},
        createdBy: "system"
      });
      await this.configRepo.save(config);

      // 8. Complete Job
      job.complete();
      await this.jobRepo.save(job);

      return { workspaceId: workspaceId.value, jobId: jobId.value };
    } catch (error: any) {
      job.fail(error.message);
      await this.jobRepo.save(job);
      throw error;
    }
  }
}
