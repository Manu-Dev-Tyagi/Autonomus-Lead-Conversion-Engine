export interface InteractionTrackerPort {
  record(input: {
    tenantId: string;
    leadId: string;
    type: "email" | "reply" | "meeting";
    payload: Record<string, unknown>;
    occurredAt: string;
  }): Promise<void>;
}
