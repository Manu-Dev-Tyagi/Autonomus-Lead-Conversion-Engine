import { describe, expect, it } from "vitest";

import { loadTemplateSeeds } from "@/src/core/infrastructure/adapters/templates/TemplateSeedLoader";
import { TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

describe("TemplateSeedLoader", () => {
  it("loads templates from seed json", () => {
    const repository = new TemplateRepository();
    const loaded = loadTemplateSeeds(repository, "tenant-1");

    expect(loaded).toBeGreaterThan(0);
    expect(repository.listByTenant("tenant-1").length).toBe(loaded);
  });
});
