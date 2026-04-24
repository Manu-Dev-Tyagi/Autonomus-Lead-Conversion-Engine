export interface SendTimingPort {
  nextSendAt(input: { tenantId: string; leadId: string }): Promise<string>;
}
