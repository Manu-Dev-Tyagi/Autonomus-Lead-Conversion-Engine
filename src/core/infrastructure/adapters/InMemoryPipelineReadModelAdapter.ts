import { PipelineReadModelPort } from "@/src/core/application/ports/PipelineReadModelPort";

export class InMemoryPipelineReadModelAdapter implements PipelineReadModelPort {
  private readonly records = new Map<string, Record<string, unknown>>();

  async upsert(input: {
    tenantId: string;
    leadId: string;
    state: string;
    score: number | null;
    updatedAt: string;
  }): Promise<void> {
    this.records.set(`${input.tenantId}:${input.leadId}`, input);
  }
}
