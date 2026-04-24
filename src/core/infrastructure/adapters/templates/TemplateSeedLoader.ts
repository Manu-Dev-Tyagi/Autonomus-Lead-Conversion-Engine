import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

interface TemplateSeedRecord {
  readonly name: string;
  readonly segment: string;
  readonly sequenceStep: number;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
}

export function loadTemplateSeeds(
  repository: TemplateRepository,
  tenantId: string,
  seedPath: string = resolve(
    process.cwd(),
    "src/core/infrastructure/adapters/templates/templates.seed.json",
  ),
): number {
  const contents = readFileSync(seedPath, "utf8");
  const records = JSON.parse(contents) as TemplateSeedRecord[];
  for (const record of records) {
    repository.create({
      tenantId,
      segment: record.segment,
      sequenceStep: record.sequenceStep,
      name: record.name,
      subjectTemplate: record.subjectTemplate,
      bodyTemplate: record.bodyTemplate,
    });
  }
  return records.length;
}
