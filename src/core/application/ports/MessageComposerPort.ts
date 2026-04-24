export interface ComposedMessage {
  readonly subject: string;
  readonly body: string;
  readonly templateId?: string;
}

export interface MessageComposerPort {
  compose(input: {
    tenantId: string;
    leadId: string;
    sequenceId: string;
    leadAttributes?: Record<string, string | number | boolean>;
    templateCandidates?: Array<{
      id: string;
      subjectTemplate: string;
      bodyTemplate: string;
      replyRate: number;
      bookingRate: number;
    }>;
    selectedTemplateId?: string;
  }): Promise<ComposedMessage>;
}
