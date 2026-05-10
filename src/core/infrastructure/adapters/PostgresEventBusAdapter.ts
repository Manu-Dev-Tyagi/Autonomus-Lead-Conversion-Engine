import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { DomainEvent } from "@/src/core/domain/events/DomainEventType";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class PostgresEventBusAdapter implements EventBusPort {
  private readonly client?: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client;
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const { error } = await this.getClient()
      .from("domain_events")
      .insert({
        tenant_id: event.tenantId,
        type: event.type,
        aggregate_id: event.aggregateId,
        payload: event.payload,
        occurred_at: event.occurredAt,
      });

    if (error) {
      throw new Error(`Failed to publish event to Postgres: ${error.message}`);
    }
  }

  private buildClientFromEnv(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Missing Supabase env vars for PostgresEventBusAdapter.");
    }
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private getClient(): SupabaseClient {
    return this.client ?? this.buildClientFromEnv();
  }
}
