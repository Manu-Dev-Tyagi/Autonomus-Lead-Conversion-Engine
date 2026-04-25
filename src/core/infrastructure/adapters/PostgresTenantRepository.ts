import { TenantRepositoryPort } from "@/src/core/application/ports/TenantRepositoryPort";
import { Tenant, TenantPlan, TenantStatus } from "@/src/core/domain/shared/Tenant";
import { TenantId } from "@/src/core/domain/shared/ids";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  industry: string | null;
  company_size: string | null;
  config: any;
  created_at: string;
  updated_at: string;
}

export class PostgresTenantRepository implements TenantRepositoryPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async save(tenant: Tenant): Promise<void> {
    const row: Record<string, unknown> = {
      id: tenant.id.value,
      name: tenant.name,
      slug: tenant.slug,
      created_at: tenant.createdAt.toISOString(),
      updated_at: tenant.updatedAt.toISOString(),
    };
    // These columns definitely exist now after migration
    row.plan = tenant.plan;
    row.status = tenant.status;
    row.industry = tenant.industry;
    row.company_size = tenant.companySize;
    row.config = tenant.config;

    const { error } = await this.getClient().from("tenants").upsert(row);
    if (error) {
      throw new Error(`Failed to save tenant: ${error.message}`);
    }
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    const { data, error } = await this.getClient()
      .from("tenants")
      .select("*")
      .eq("id", id.value)
      .maybeSingle<TenantRow>();
    if (error) {
      throw new Error(`Failed to find tenant by id: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const { data, error } = await this.getClient()
      .from("tenants")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .maybeSingle<TenantRow>();
    if (error) {
      throw new Error(`Failed to find tenant by slug: ${error.message}`);
    }
    if (!data) return null;
    return this.toDomain(data);
  }

  async addMembership(tenantId: TenantId, userId: string, role: string): Promise<void> {
    const { error } = await this.getClient().from("tenant_memberships").insert({
      tenant_id: tenantId.value,
      user_id: userId,
      role: role,
    });
    if (error) {
      throw new Error(`Failed to add tenant membership: ${error.message}`);
    }
  }

  private toDomain(row: TenantRow): Tenant {
    return Tenant.create({
      id: new TenantId(row.id),
      name: row.name,
      slug: row.slug,
      plan: row.plan as TenantPlan,
      status: row.status as TenantStatus,
      industry: row.industry,
      companySize: row.company_size,
      config: row.config,
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
