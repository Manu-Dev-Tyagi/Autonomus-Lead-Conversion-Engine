import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class PostgresHistoricalOutcomesReadAdapter implements HistoricalOutcomesReadPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async getConversionRate(input: { tenantId: string; segmentKey: string }): Promise<number | null> {
    const { data, error } = await this.getClient()
      .from("outcomes")
      .select("type, metadata")
      .eq("tenant_id", input.tenantId)
      .limit(500);

    if (error) {
      throw new Error(`Failed to read historical outcomes: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{ type?: string; metadata?: Record<string, unknown> | null }>;
    const segmentRows = rows.filter((row) => {
      const metadata = row.metadata ?? {};
      return metadata.segmentKey === input.segmentKey;
    });

    if (segmentRows.length === 0) {
      return null;
    }

    const convertedCount = segmentRows.filter((row) => row.type === "converted").length;
    const rate = convertedCount / segmentRows.length;
    return Math.max(0, Math.min(1, rate));
  }

  private buildClientFromEnv(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Missing Supabase env vars for PostgresHistoricalOutcomesReadAdapter.");
    }
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private getClient(): SupabaseClient {
    return this.client ?? this.buildClientFromEnv();
  }
}
