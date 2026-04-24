export interface HumanApprovalPort {
  request(input: {
    tenantId: string;
    leadId: string;
    action: string;
    confidence: number;
    reason: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
