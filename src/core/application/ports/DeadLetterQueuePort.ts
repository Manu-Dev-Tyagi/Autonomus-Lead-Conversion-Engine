export interface DeadLetterQueuePort {
  enqueue(input: {
    tenantId: string;
    leadId: string;
    idempotencyKey: string;
    stage: "enrichment" | "scoring";
    reason: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<void>;
}
