export interface PolicyEnginePort {
  assertAllowed(input: {
    tenantId: string;
    leadId: string;
    action: string;
    confidence: number;
  }): Promise<void>;
}
