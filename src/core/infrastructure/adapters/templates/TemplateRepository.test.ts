import { describe, expect, it } from "vitest";

import { TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

describe("TemplateRepository", () => {
  it("creates and retrieves templates", () => {
    const repository = new TemplateRepository();
    const template = repository.create({
      tenantId: "tenant-1",
      segment: "saas_vp_engineering",
      sequenceStep: 1,
      name: "Intro",
      subjectTemplate: "Hello",
      bodyTemplate: "Body",
    });

    expect(repository.findById(template.id)?.name).toBe("Intro");
    expect(repository.listByTenant("tenant-1")).toHaveLength(1);
  });

  it("returns best performing templates for segment and step", () => {
    const repository = new TemplateRepository();
    const low = repository.create({
      tenantId: "tenant-1",
      segment: "saas_vp_engineering",
      sequenceStep: 1,
      name: "Low",
      subjectTemplate: "s1",
      bodyTemplate: "b1",
    });
    const high = repository.create({
      tenantId: "tenant-1",
      segment: "saas_vp_engineering",
      sequenceStep: 1,
      name: "High",
      subjectTemplate: "s2",
      bodyTemplate: "b2",
    });

    repository.upsert({ ...low, replyRate: 0.1, bookingRate: 0.02, usageCount: 10, updatedAt: new Date().toISOString() });
    repository.upsert({ ...high, replyRate: 0.4, bookingRate: 0.2, usageCount: 10, updatedAt: new Date().toISOString() });

    const best = repository.getBestPerforming("tenant-1", "saas_vp_engineering", 1, 1);
    expect(best[0]?.name).toBe("High");
  });
});
