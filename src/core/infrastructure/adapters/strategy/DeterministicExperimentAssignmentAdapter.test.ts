import { describe, expect, it } from "vitest";

import { DeterministicExperimentAssignmentAdapter } from "@/src/core/infrastructure/adapters/strategy/DeterministicExperimentAssignmentAdapter";

describe("DeterministicExperimentAssignmentAdapter", () => {
  it("returns stable variant for same tenant/subject/experiment", async () => {
    const adapter = new DeterministicExperimentAssignmentAdapter();
    const first = await adapter.assign({
      tenantId: "tenant-1",
      experimentKey: "sequence_selector:example.com",
      subjectId: "lead-42",
      variants: ["a", "b"],
    });
    const second = await adapter.assign({
      tenantId: "tenant-1",
      experimentKey: "sequence_selector:example.com",
      subjectId: "lead-42",
      variants: ["a", "b"],
    });

    expect(first).toBe(second);
  });
});
