export interface SequencePlan {
  readonly sequenceId: string;
  readonly step: number;
  readonly channel: "email";
}

export interface StrategyPlannerPort {
  plan(input: { tenantId: string; leadId: string }): Promise<SequencePlan>;
}
