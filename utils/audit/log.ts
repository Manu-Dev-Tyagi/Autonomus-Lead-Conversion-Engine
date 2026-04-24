import { getAdminClient } from "@/utils/supabase/admin";

export async function recordAuditLog(input: {
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from("audit_logs").insert({
      tenant_id: input.tenantId,
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    // Never break product flow because of audit logging issues.
    console.error("audit_log_failed", {
      action: input.action,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
