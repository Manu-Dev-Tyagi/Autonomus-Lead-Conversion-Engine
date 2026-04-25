import { WorkspaceId, TenantId } from "@/src/core/domain/shared/ids";
import { WorkspaceStatus } from "@/src/core/domain/workspace/WorkspaceStatus";

export class Workspace {
  private constructor(
    public readonly id: WorkspaceId,
    public readonly tenantId: TenantId,
    public readonly name: string,
    public readonly slug: string,
    public status: WorkspaceStatus,
    public readonly ownerUserId: string,
    public readonly industry: string | null = null,
    public readonly companySize: string | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  static create(input: {
    id: WorkspaceId;
    tenantId: TenantId;
    name: string;
    slug: string;
    ownerUserId: string;
    status?: WorkspaceStatus;
    industry?: string | null;
    companySize?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Workspace {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Workspace name is required.");
    }
    if (!input.slug || input.slug.trim().length === 0) {
      throw new Error("Workspace slug is required.");
    }
    if (!input.ownerUserId) {
      throw new Error("Workspace owner is required.");
    }

    return new Workspace(
      input.id,
      input.tenantId,
      input.name,
      input.slug.toLowerCase(),
      input.status ?? WorkspaceStatus.Provisioning,
      input.ownerUserId,
      input.industry ?? null,
      input.companySize ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date()
    );
  }

  activate(): void {
    this.status = WorkspaceStatus.Active;
  }

  fail(): void {
    this.status = WorkspaceStatus.Failed;
  }
}
