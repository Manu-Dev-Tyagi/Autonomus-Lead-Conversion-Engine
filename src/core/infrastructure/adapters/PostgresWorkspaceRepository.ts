import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { Workspace } from "@/src/core/domain/workspace/Workspace";
import { WorkspaceStatus } from "@/src/core/domain/workspace/WorkspaceStatus";
import { WorkspaceId, TenantId } from "@/src/core/domain/shared/ids";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface WorkspaceRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: string;
  industry: string | null;
  company_size: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export class PostgresWorkspaceRepository implements WorkspaceRepositoryPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async save(workspace: Workspace): Promise<void> {
    const { error } = await this.getClient().from("workspaces").upsert({
      id: workspace.id.value,
      tenant_id: workspace.tenantId.value,
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      industry: workspace.industry,
      company_size: workspace.companySize,
      owner_user_id: workspace.ownerUserId,
      created_at: workspace.createdAt.toISOString(),
      updated_at: workspace.updatedAt.toISOString(),
    });
    if (error) {
      throw new Error(`Failed to save workspace: ${error.message}`);
    }
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    const { data, error } = await this.getClient()
      .from("workspaces")
      .select("*")
      .eq("id", id.value)
      .maybeSingle<WorkspaceRow>();
    if (error) {
      throw new Error(`Failed to find workspace by id: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async findByTenantId(tenantId: TenantId): Promise<Workspace | null> {
    const { data, error } = await this.getClient()
      .from("workspaces")
      .select("*")
      .eq("tenant_id", tenantId.value)
      .maybeSingle<WorkspaceRow>();
    if (error) {
      throw new Error(`Failed to find workspace by tenantId: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const { data, error } = await this.getClient()
      .from("workspaces")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .maybeSingle<WorkspaceRow>();
    if (error) {
      throw new Error(`Failed to find workspace by slug: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async listAll(): Promise<Workspace[]> {
    const { data, error } = await this.getClient()
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to list all workspaces: ${error.message}`);
    }
    return (data ?? []).map(row => this.toDomain(row as WorkspaceRow));
  }

  private toDomain(row: WorkspaceRow): Workspace {
    return Workspace.create({
      id: new WorkspaceId(row.id),
      tenantId: new TenantId(row.tenant_id),
      name: row.name,
      slug: row.slug,
      status: row.status as WorkspaceStatus,
      industry: row.industry,
      companySize: row.company_size,
      ownerUserId: row.owner_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
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
