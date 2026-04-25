import { WorkspaceConfig } from "@/src/core/domain/workspace/WorkspaceConfig";
import { WorkspaceId } from "@/src/core/domain/shared/ids";

export interface WorkspaceConfigPort {
  save(config: WorkspaceConfig): Promise<void>;
  findActiveByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceConfig | null>;
  listVersions(workspaceId: WorkspaceId): Promise<WorkspaceConfig[]>;
}
