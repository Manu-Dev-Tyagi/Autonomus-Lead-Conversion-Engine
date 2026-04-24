import { describe, expect, it } from "vitest";

import { TemplatePerformanceTracker } from "@/src/core/infrastructure/adapters/templates/TemplatePerformanceTracker";
import { TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

describe("TemplatePerformanceTracker", () => {
  it("updates template usage and performance rates", () => {
    const repository = new TemplateRepository();
    const tracker = new TemplatePerformanceTracker(repository);
    const template = repository.create({
      tenantId: "tenant-1",
      segment: "saas_vp_engineering",
      sequenceStep: 1,
      name: "Intro",
      subjectTemplate: "Hello",
      bodyTemplate: "Body",
    });

    tracker.record({ templateId: template.id, replied: true, booked: false });
    const updated = tracker.record({ templateId: template.id, replied: false, booked: true });

    expect(updated.usageCount).toBe(2);
    expect(updated.replyRate).toBe(0.5);
    expect(updated.bookingRate).toBe(0.5);
  });
});
