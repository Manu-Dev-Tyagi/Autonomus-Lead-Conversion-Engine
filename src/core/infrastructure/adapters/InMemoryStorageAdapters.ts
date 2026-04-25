import { ProvisioningJobPort } from "@/src/core/application/ports/ProvisioningJobPort";
import { ProvisioningJob } from "@/src/core/domain/workspace/ProvisioningJob";
import { ProvisioningJobId, WorkspaceId, TenantId } from "@/src/core/domain/shared/ids";
import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadId } from "@/src/core/domain/shared/ids";
import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { Workspace } from "@/src/core/domain/workspace/Workspace";
import { WorkspaceConfigPort } from "@/src/core/application/ports/WorkspaceConfigPort";
import { WorkspaceConfig } from "@/src/core/domain/workspace/WorkspaceConfig";
import { WorkspaceConfigId } from "@/src/core/domain/shared/ids";

export class InMemoryProvisioningJobRepository implements ProvisioningJobPort {
  private readonly jobs = new Map<string, ProvisioningJob>();
  async save(job: ProvisioningJob): Promise<void> { this.jobs.set(job.id.value, job); }
  async findById(id: ProvisioningJobId): Promise<ProvisioningJob | null> { return this.jobs.get(id.value) ?? null; }
  async findByIdempotencyKey(key: string): Promise<ProvisioningJob | null> {
    return Array.from(this.jobs.values()).find(j => j.idempotencyKey === key) ?? null;
  }
  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProvisioningJob[]> {
    return Array.from(this.jobs.values()).filter(j => j.workspaceId.value === workspaceId.value);
  }
}

export class InMemoryLeadRepository implements LeadRepositoryPort {
  private readonly leads = new Map<string, Lead>();
  async save(lead: Lead): Promise<void> { this.leads.set(lead.id.value, lead); }
  async findById(tenantId: TenantId, id: LeadId): Promise<Lead | null> { return this.leads.get(id.value) ?? null; }
  async findByEmail(tenantId: TenantId, email: string): Promise<Lead | null> {
    return Array.from(this.leads.values()).find(l => l.email === email && l.tenantId.value === tenantId.value) ?? null;
  }
  async listByTenant(tenantId: TenantId): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(l => l.tenantId.value === tenantId.value);
  }
}

export class InMemoryWorkspaceRepository implements WorkspaceRepositoryPort {
  private readonly workspaces = new Map<string, Workspace>();
  async save(workspace: Workspace): Promise<void> { this.workspaces.set(workspace.id.value, workspace); }
  async findById(id: WorkspaceId): Promise<Workspace | null> { return this.workspaces.get(id.value) ?? null; }
  async findBySlug(slug: string): Promise<Workspace | null> {
    return Array.from(this.workspaces.values()).find(w => w.slug === slug) ?? null;
  }
  async findByTenantId(tenantId: TenantId): Promise<Workspace | null> {
    return Array.from(this.workspaces.values()).find(w => w.tenantId.value === tenantId.value) ?? null;
  }
  async listAll(): Promise<Workspace[]> { return Array.from(this.workspaces.values()); }
}

export class InMemoryWorkspaceConfigRepository implements WorkspaceConfigPort {
  private readonly configs = new Map<string, WorkspaceConfig>();
  async save(config: WorkspaceConfig): Promise<void> { this.configs.set(config.id.value, config); }
  async findById(id: WorkspaceConfigId): Promise<WorkspaceConfig | null> { return this.configs.get(id.value) ?? null; }
  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceConfig | null> { return this.findActiveByWorkspaceId(workspaceId); }
  async findActiveByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceConfig | null> {
    return Array.from(this.configs.values()).find(c => c.workspaceId.value === workspaceId.value) ?? null;
  }
  async listVersions(workspaceId: WorkspaceId): Promise<WorkspaceConfig[]> {
     return Array.from(this.configs.values()).filter(c => c.workspaceId.value === workspaceId.value);
  }
}
