import { DeadLetterQueuePort } from "@/src/core/application/ports/DeadLetterQueuePort";

export class InMemoryDeadLetterQueueAdapter implements DeadLetterQueuePort {
  private readonly items: Array<Record<string, unknown>> = [];

  async enqueue(input: {
    tenantId: string;
    leadId: string;
    idempotencyKey: string;
    stage: "enrichment" | "scoring";
    reason: string;
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<void> {
    this.items.push(input);
  }
}
