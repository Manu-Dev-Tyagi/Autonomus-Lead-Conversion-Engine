import { ProvisioningJobId, WorkspaceId } from "@/src/core/domain/shared/ids";

export enum ProvisioningStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

export class ProvisioningJob {
  private constructor(
    public readonly id: ProvisioningJobId,
    public readonly workspaceId: WorkspaceId,
    public readonly idempotencyKey: string,
    public status: ProvisioningStatus,
    public step: string,
    public attemptCount: number,
    public lastError: string | null,
    public startedAt: Date | null,
    public completedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    id: ProvisioningJobId;
    workspaceId: WorkspaceId;
    idempotencyKey: string;
    status?: ProvisioningStatus;
    step?: string;
    attemptCount?: number;
    lastError?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
  }): ProvisioningJob {
    return new ProvisioningJob(
      input.id,
      input.workspaceId,
      input.idempotencyKey,
      input.status ?? ProvisioningStatus.Pending,
      input.step ?? "created",
      input.attemptCount ?? 0,
      input.lastError ?? null,
      input.startedAt ?? null,
      input.completedAt ?? null,
      input.createdAt ?? new Date()
    );
  }

  start(): void {
    this.status = ProvisioningStatus.Running;
    this.startedAt = new Date();
    this.attemptCount++;
  }

  complete(): void {
    this.status = ProvisioningStatus.Completed;
    this.completedAt = new Date();
    this.step = "completed";
  }

  fail(error: string): void {
    this.status = ProvisioningStatus.Failed;
    this.lastError = error;
  }
}
