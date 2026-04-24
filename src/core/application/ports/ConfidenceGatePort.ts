export interface ConfidenceGatePort {
  requiresApproval(input: {
    tenantId: string;
    action: string;
    confidence: number;
  }): Promise<boolean>;
}
