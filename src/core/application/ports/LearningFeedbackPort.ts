export interface LearningFeedbackPort {
  capture(input: {
    tenantId: string;
    leadId: string;
    signal: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
