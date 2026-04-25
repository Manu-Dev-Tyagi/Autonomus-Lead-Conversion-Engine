import { WorkspaceConfigPort } from "@/src/core/application/ports/WorkspaceConfigPort";
import { WorkspaceConfig } from "@/src/core/domain/workspace/WorkspaceConfig";
import { WorkspaceId, WorkspaceConfigId } from "@/src/core/domain/shared/ids";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface WorkspaceConfigRow {
  id: string;
  workspace_id: string;
  version: number;
  config: any;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export class PostgresWorkspaceConfigRepository implements WorkspaceConfigPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async save(config: WorkspaceConfig): Promise<void> {
    const { error } = await this.getClient().from("workspace_configs").upsert({
      id: config.id.value,
      workspace_id: config.workspaceId.value,
      version: config.version,
      config: config.config,
      is_active: config.isActive,
      created_by: config.createdBy,
      created_at: config.createdAt.toISOString(),
    });
    if (error) {
      throw new Error(`Failed to save workspace config: ${error.message}`);
    }
  }

  async findActiveByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceConfig | null> {
    const { data, error } = await this.getClient()
      .from("workspace_configs")
      .select("*")
      .eq("workspace_id", workspaceId.value)
      .eq("is_active", true)
      .maybeSingle<WorkspaceConfigRow>();
    if (error) {
      throw new Error(`Failed to find active workspace config: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async listVersions(workspaceId: WorkspaceId): Promise<WorkspaceConfig[]> {
    const { data, error } = await this.getClient()
      .from("workspace_configs")
      .select("*")
      .eq("workspace_id", workspaceId.value)
      .order("version", { ascending: false });
    if (error) {
      throw new Error(`Failed to list workspace config versions: ${error.message}`);
    }
    return (data ?? []).map(row => this.toDomain(row as WorkspaceConfigRow));
  }

  private toDomain(row: WorkspaceConfigRow): WorkspaceConfig {
    return WorkspaceConfig.create({
      id: new WorkspaceConfigId(row.id),
      workspaceId: new WorkspaceId(row.workspace_id),
      version: row.version,
      config: row.config,
      isActive: row.is_active,
      createdBy: row.created_by,
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
