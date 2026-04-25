import { ProvisioningJobPort } from "@/src/core/application/ports/ProvisioningJobPort";
import { ProvisioningJob, ProvisioningStatus } from "@/src/core/domain/workspace/ProvisioningJob";
import { ProvisioningJobId, WorkspaceId } from "@/src/core/domain/shared/ids";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface ProvisioningJobRow {
  id: string;
  workspace_id: string;
  idempotency_key: string;
  status: string;
  step: string;
  attempt_count: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export class PostgresProvisioningJobRepository implements ProvisioningJobPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async save(job: ProvisioningJob): Promise<void> {
    const { error } = await this.getClient().from("workspace_provisioning_jobs").upsert({
      id: job.id.value,
      workspace_id: job.workspaceId.value,
      idempotency_key: job.idempotencyKey,
      status: job.status,
      step: job.step,
      attempt_count: job.attemptCount,
      last_error: job.lastError,
      started_at: job.startedAt?.toISOString() ?? null,
      completed_at: job.completedAt?.toISOString() ?? null,
      created_at: job.createdAt.toISOString(),
    });
    if (error) {
      throw new Error(`Failed to save provisioning job: ${error.message}`);
    }
  }

  async findById(id: ProvisioningJobId): Promise<ProvisioningJob | null> {
    const { data, error } = await this.getClient()
      .from("workspace_provisioning_jobs")
      .select("*")
      .eq("id", id.value)
      .maybeSingle<ProvisioningJobRow>();
    if (error) {
      throw new Error(`Failed to find provisioning job by id: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByIdempotencyKey(key: string): Promise<ProvisioningJob | null> {
    const { data, error } = await this.getClient()
      .from("workspace_provisioning_jobs")
      .select("*")
      .eq("idempotency_key", key)
      .maybeSingle<ProvisioningJobRow>();
    if (error) {
      throw new Error(`Failed to find provisioning job by idempotency key: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProvisioningJob[]> {
    const { data, error } = await this.getClient()
      .from("workspace_provisioning_jobs")
      .select("*")
      .eq("workspace_id", workspaceId.value)
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to find provisioning jobs by workspace id: ${error.message}`);
    }
    return (data ?? []).map(row => this.toDomain(row as ProvisioningJobRow));
  }

  private toDomain(row: ProvisioningJobRow): ProvisioningJob {
    return ProvisioningJob.create({
      id: new ProvisioningJobId(row.id),
      workspaceId: new WorkspaceId(row.workspace_id),
      idempotencyKey: row.idempotency_key,
      status: row.status as ProvisioningStatus,
      step: row.step,
      attemptCount: row.attempt_count,
      lastError: row.last_error,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdAt: new Date(row.created_at),
    });
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars.");
    return createClient(url, key, { auth: { persistSession: false } });
  }
}
