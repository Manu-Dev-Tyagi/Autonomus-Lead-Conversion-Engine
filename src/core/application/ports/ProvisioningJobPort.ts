import { ProvisioningJob } from "@/src/core/domain/workspace/ProvisioningJob";
import { ProvisioningJobId, WorkspaceId } from "@/src/core/domain/shared/ids";

export interface ProvisioningJobPort {
  save(job: ProvisioningJob): Promise<void>;
  findById(id: ProvisioningJobId): Promise<ProvisioningJob | null>;
  findByIdempotencyKey(key: string): Promise<ProvisioningJob | null>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProvisioningJob[]>;
}
