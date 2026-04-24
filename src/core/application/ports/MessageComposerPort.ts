export interface ComposedMessage {
  readonly subject: string;
  readonly body: string;
}

export interface MessageComposerPort {
  compose(input: { tenantId: string; leadId: string; sequenceId: string }): Promise<ComposedMessage>;
}
