import { describe, expect, it } from "vitest";

import { DomainEventType } from "@/src/core/domain/events/DomainEventType";
import { QueueEventBusAdapter } from "@/src/core/infrastructure/adapters/QueueEventBusAdapter";

describe("Queue load and soak baseline", () => {
  it("handles sustained enqueue/drain cycles without overflow", async () => {
    const queue = new QueueEventBusAdapter(5000);

    for (let cycle = 0; cycle < 10; cycle += 1) {
      for (let index = 0; index < 300; index += 1) {
        await queue.publish({
          type: DomainEventType.LeadScored,
          aggregateId: `lead-${cycle}-${index}`,
          tenantId: "tenant-load",
          occurredAt: new Date().toISOString(),
          payload: { schemaVersion: 1, score: 80 },
        });
      }
      const drained = queue.drainBatch(250);
      expect(drained.length).toBe(250);
    }

    expect(queue.getQueueDepth()).toBe(500);
  });
});
