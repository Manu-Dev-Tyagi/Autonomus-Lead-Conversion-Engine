import {
  SequenceDefinition,
  SequenceLibraryPort,
} from "@/src/core/application/ports/SequenceLibraryPort";

const DEFAULT_SEQUENCES: SequenceDefinition[] = [
  {
    id: "seq-default-short",
    tenantId: "default",
    name: "Default 3-touch sequence",
    stepCount: 3,
    channel: "email",
  },
  {
    id: "seq-default-long",
    tenantId: "default",
    name: "Default 5-touch sequence",
    stepCount: 5,
    channel: "email",
  },
];

export class InMemorySequenceLibraryAdapter implements SequenceLibraryPort {
  private readonly records: SequenceDefinition[];

  constructor(seed: SequenceDefinition[] = DEFAULT_SEQUENCES) {
    this.records = [...seed];
  }

  async listByTenant(tenantId: string): Promise<SequenceDefinition[]> {
    const tenantMatches = this.records.filter((record) => record.tenantId === tenantId);
    if (tenantMatches.length > 0) {
      return tenantMatches;
    }
    return this.records.filter((record) => record.tenantId === "default");
  }
}
