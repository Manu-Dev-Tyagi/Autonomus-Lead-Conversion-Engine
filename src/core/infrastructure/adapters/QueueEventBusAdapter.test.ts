import { describe, expect, it } from "vitest";

import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { QueueEventBusAdapter } from "@/src/core/infrastructure/adapters/QueueEventBusAdapter";

describe("QueueEventBusAdapter", () => {
  it("queues events and drains batches", async () => {
    const bus = new QueueEventBusAdapter(10);
    await bus.publish({
      type: DomainEventType.LeadCreated,
      aggregateId: "a",
      tenantId: "t",
      occurredAt: new Date().toISOString(),
      payload: { schemaVersion: 1 },
    });
    await bus.publish({
      type: DomainEventType.LeadScored,
      aggregateId: "b",
      tenantId: "t",
      occurredAt: new Date().toISOString(),
      payload: { schemaVersion: 1 },
    });

    expect(bus.getQueueDepth()).toBe(2);
    const drained = bus.drainBatch(1);
    expect(drained).toHaveLength(1);
    expect(bus.getQueueDepth()).toBe(1);
  });

  it("enforces backpressure limit", async () => {
    const bus = new QueueEventBusAdapter(1);
    await bus.publish({
      type: DomainEventType.LeadCreated,
      aggregateId: "a",
      tenantId: "t",
      occurredAt: new Date().toISOString(),
      payload: { schemaVersion: 1 },
    });

    await expect(
      bus.publish({
        type: DomainEventType.LeadScored,
        aggregateId: "b",
        tenantId: "t",
        occurredAt: new Date().toISOString(),
        payload: { schemaVersion: 1 },
      }),
    ).rejects.toThrowError("Event queue is full. Backpressure protection activated.");
  });
});
