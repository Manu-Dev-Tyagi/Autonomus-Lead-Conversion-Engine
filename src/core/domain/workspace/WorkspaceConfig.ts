import { WorkspaceId, WorkspaceConfigId } from "@/src/core/domain/shared/ids";

export class WorkspaceConfig {
  private constructor(
    public readonly id: WorkspaceConfigId,
    public readonly workspaceId: WorkspaceId,
    public readonly version: number,
    public readonly config: Record<string, any>,
    public readonly isActive: boolean,
    public readonly createdBy: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    id: WorkspaceConfigId;
    workspaceId: WorkspaceId;
    version: number;
    config: Record<string, any>;
    isActive?: boolean;
    createdBy?: string | null;
    createdAt?: Date;
  }): WorkspaceConfig {
    return new WorkspaceConfig(
      input.id,
      input.workspaceId,
      input.version,
      input.config,
      input.isActive ?? true,
      input.createdBy ?? null,
      input.createdAt ?? new Date()
    );
  }
}
