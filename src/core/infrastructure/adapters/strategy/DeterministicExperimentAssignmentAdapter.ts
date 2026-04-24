import { createHash } from "node:crypto";

import { ExperimentAssignmentPort } from "@/src/core/application/ports/ExperimentAssignmentPort";

export class DeterministicExperimentAssignmentAdapter implements ExperimentAssignmentPort {
  async assign(input: {
    tenantId: string;
    experimentKey: string;
    subjectId: string;
    variants: string[];
  }): Promise<string> {
    if (input.variants.length === 0) {
      throw new Error("Experiment assignment requires at least one variant.");
    }

    const hash = createHash("sha256")
      .update(`${input.tenantId}:${input.experimentKey}:${input.subjectId}`)
      .digest("hex");
    const numeric = Number.parseInt(hash.slice(0, 8), 16);
    const index = numeric % input.variants.length;
    return input.variants[index];
  }
}
