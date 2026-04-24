export interface SequencePlan {
  readonly sequenceId: string;
  readonly step: number;
  readonly channel: "email";
  readonly expectedReplyRate?: number;
  readonly experimentVariant?: string;
}

export interface StrategyPlannerPort {
  plan(input: { tenantId: string; leadId: string; leadEmail?: string }): Promise<SequencePlan>;
}
