import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

const validTransitions: Record<LeadState, LeadState[]> = {
  [LeadState.New]: [LeadState.Enriching, LeadState.Disqualified],
  [LeadState.Enriching]: [LeadState.Enriched, LeadState.Disqualified],
  [LeadState.Enriched]: [LeadState.Scoring, LeadState.Disqualified],
  [LeadState.Scoring]: [LeadState.Qualified, LeadState.Disqualified],
  [LeadState.Qualified]: [LeadState.Outreach, LeadState.Lost],
  [LeadState.Disqualified]: [],
  [LeadState.Outreach]: [LeadState.Replied, LeadState.Lost],
  [LeadState.Replied]: [LeadState.Booked, LeadState.Lost],
  [LeadState.Booked]: [LeadState.Converted, LeadState.Lost],
  [LeadState.Converted]: [],
  [LeadState.Lost]: [],
};

export class Lead {
  private constructor(
    public readonly id: LeadId,
    public readonly tenantId: TenantId,
    public readonly email: string,
    public state: LeadState,
    public score: number | null,
  ) {}

  static create(input: {
    id: LeadId;
    tenantId: TenantId;
    email: string;
    state?: LeadState;
    score?: number | null;
  }): Lead {
    if (!input.email || !input.email.includes("@")) {
      throw new Error("Lead email is invalid.");
    }

    const score = input.score ?? null;
    if (score !== null && (score < 0 || score > 100)) {
      throw new Error("Lead score must be between 0 and 100.");
    }

    return new Lead(input.id, input.tenantId, input.email, input.state ?? LeadState.New, score);
  }

  transitionTo(nextState: LeadState): void {
    const allowed = validTransitions[this.state];
    if (!allowed.includes(nextState)) {
      throw new Error(`Invalid lead transition: ${this.state} -> ${nextState}`);
    }
    this.state = nextState;
  }

  updateScore(score: number): void {
    if (score < 0 || score > 100) {
      throw new Error("Lead score must be between 0 and 100.");
    }
    this.score = score;
  }
}
