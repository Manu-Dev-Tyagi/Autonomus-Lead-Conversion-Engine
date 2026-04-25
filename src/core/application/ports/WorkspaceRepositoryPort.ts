import { Workspace } from "@/src/core/domain/workspace/Workspace";
import { WorkspaceId, TenantId } from "@/src/core/domain/shared/ids";

export interface WorkspaceRepositoryPort {
  save(workspace: Workspace): Promise<void>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findByTenantId(tenantId: TenantId): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  listAll(): Promise<Workspace[]>;
}
