import { LeadRepositoryPort } from "@/src/core/application/ports/LeadRepositoryPort";
import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface LeadRow {
  id: string;
  tenant_id: string;
  email: string;
  state: string;
  score: number | null;
}

export class PostgresLeadRepository implements LeadRepositoryPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async save(lead: Lead): Promise<void> {
    const { error } = await this.getClient().from("leads").upsert({
      id: lead.id.value,
      tenant_id: lead.tenantId.value,
      email: lead.email,
      state: lead.state,
      score: lead.score,
    });
    if (error) {
      throw new Error(`Failed to save lead: ${error.message}`);
    }
  }

  async findById(tenantId: TenantId, leadId: LeadId): Promise<Lead | null> {
    const { data, error } = await this.getClient()
      .from("leads")
      .select("id, tenant_id, email, state, score")
      .eq("tenant_id", tenantId.value)
      .eq("id", leadId.value)
      .maybeSingle<LeadRow>();
    if (error) {
      throw new Error(`Failed to find lead by id: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return this.toDomain(data);
  }

  async findByEmail(tenantId: TenantId, email: string): Promise<Lead | null> {
    const { data, error } = await this.getClient()
      .from("leads")
      .select("id, tenant_id, email, state, score")
      .eq("tenant_id", tenantId.value)
      .eq("email", email)
      .maybeSingle<LeadRow>();
    if (error) {
      throw new Error(`Failed to find lead by email: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return this.toDomain(data);
  }

  private toDomain(row: LeadRow): Lead {
    if (!Object.values(LeadState).includes(row.state as LeadState)) {
      throw new Error(`Invalid lead state in persistence layer: ${row.state}`);
    }
    return Lead.create({
      id: new LeadId(row.id),
      tenantId: new TenantId(row.tenant_id),
      email: row.email,
      state: row.state as LeadState,
      score: row.score,
    });
  }

  private buildClientFromEnv(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Missing Supabase env vars for PostgresLeadRepository.");
    }
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private getClient(): SupabaseClient {
    return this.client ?? this.buildClientFromEnv();
  }
}
