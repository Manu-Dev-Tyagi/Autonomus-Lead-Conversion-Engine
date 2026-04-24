import { describe, expect, it } from "vitest";

import { TemplateLibraryAdapter } from "@/src/core/infrastructure/adapters/templates/TemplateLibraryAdapter";
import { TemplatePerformanceTracker } from "@/src/core/infrastructure/adapters/templates/TemplatePerformanceTracker";
import { TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

describe("TemplateLibraryAdapter", () => {
  it("returns best performing template candidates", async () => {
    const repository = new TemplateRepository();
    const tracker = new TemplatePerformanceTracker(repository);
    const adapter = new TemplateLibraryAdapter(repository, tracker);

    const t1 = repository.create({
      tenantId: "tenant-1",
      segment: "default",
      sequenceStep: 1,
      name: "A",
      subjectTemplate: "A",
      bodyTemplate: "A",
    });
    const t2 = repository.create({
      tenantId: "tenant-1",
      segment: "default",
      sequenceStep: 1,
      name: "B",
      subjectTemplate: "B",
      bodyTemplate: "B",
    });
    repository.upsert({ ...t1, replyRate: 0.1, bookingRate: 0.02, usageCount: 10, updatedAt: new Date().toISOString() });
    repository.upsert({ ...t2, replyRate: 0.4, bookingRate: 0.2, usageCount: 10, updatedAt: new Date().toISOString() });

    const best = await adapter.getBestPerforming({
      tenantId: "tenant-1",
      segment: "default",
      sequenceStep: 1,
      limit: 1,
    });

    expect(best).toHaveLength(1);
    expect(best[0]?.name).toBe("B");
  });
});
