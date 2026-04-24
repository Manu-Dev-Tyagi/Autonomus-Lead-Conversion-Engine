export interface PipelineReadModelPort {
  upsert(input: {
    tenantId: string;
    leadId: string;
    state: string;
    score: number | null;
    updatedAt: string;
  }): Promise<void>;
}
