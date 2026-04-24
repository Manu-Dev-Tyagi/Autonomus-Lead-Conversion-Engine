import { EventBusPort } from "@/src/core/application/ports/EventBusPort";
import { DomainEvent } from "@/src/core/domain/events/DomainEventType";

export class QueueEventBusAdapter implements EventBusPort {
  private readonly queue: Array<DomainEvent<unknown>> = [];
  private readonly maxQueueSize: number;

  constructor(maxQueueSize = Number(process.env.ALE_EVENT_QUEUE_MAX ?? 5000)) {
    this.maxQueueSize = maxQueueSize;
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error("Event queue is full. Backpressure protection activated.");
    }
    this.queue.push(event as DomainEvent<unknown>);
  }

  // Exposed for diagnostics/health checks.
  getQueueDepth(): number {
    return this.queue.length;
  }

  // Placeholder until broker consumer integration is added.
  drainBatch(limit = 100): Array<DomainEvent<unknown>> {
    return this.queue.splice(0, Math.max(0, limit));
  }
}
