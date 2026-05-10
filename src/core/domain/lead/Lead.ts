import { LeadState } from "@/src/core/domain/lead/LeadState";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";
import { EnrichmentData } from "@/src/core/domain/lead/EnrichmentData";

const validTransitions: Record<LeadState, LeadState[]> = {
  [LeadState.New]: [LeadState.Enriching, LeadState.Disqualified],
  [LeadState.Enriching]: [LeadState.Enriched, LeadState.Disqualified, LeadState.Escalated],
  [LeadState.Enriched]: [LeadState.Scoring, LeadState.Disqualified, LeadState.Review],
  [LeadState.Scoring]: [LeadState.Qualified, LeadState.Disqualified, LeadState.Review, LeadState.Escalated],
  [LeadState.Qualified]: [LeadState.Outreach, LeadState.Lost],
  [LeadState.Disqualified]: [LeadState.Review], // Allow review of disqualifications
  [LeadState.Outreach]: [LeadState.Replied, LeadState.Lost],
  [LeadState.Replied]: [LeadState.Booked, LeadState.Lost],
  [LeadState.Booked]: [LeadState.Converted, LeadState.Lost],
  [LeadState.Review]: [LeadState.Qualified, LeadState.Disqualified, LeadState.Scoring],
  [LeadState.Escalated]: [LeadState.Review, LeadState.Qualified, LeadState.Disqualified],
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
    public enrichmentData: EnrichmentData | null = null,
    public metadata: Record<string, any> = {},
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(input: {
    id: LeadId;
    tenantId: TenantId;
    email: string;
    state?: LeadState;
    score?: number | null;
    enrichmentData?: EnrichmentData | null;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
  }): Lead {
    if (!input.email || !input.email.includes("@")) {
      throw new Error("Lead email is invalid.");
    }

    const score = input.score ?? null;
    if (score !== null && (score < 0 || score > 100)) {
      throw new Error("Lead score must be between 0 and 100.");
    }

    return new Lead(
      input.id,
      input.tenantId,
      input.email,
      input.state ?? LeadState.New,
      score,
      input.enrichmentData ?? null,
      input.metadata ?? {},
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date()
    );
  }

  transitionTo(nextState: LeadState): void {
    const allowed = validTransitions[this.state];
    if (!allowed.includes(nextState)) {
      throw new Error(`Invalid lead transition: ${this.state} -> ${nextState}`);
    }
    this.state = nextState;
    this.updatedAt = new Date();
  }

  updateScore(score: number): void {
    if (score < 0 || score > 100) {
      throw new Error("Lead score must be between 0 and 100.");
    }
    this.score = score;
    this.updatedAt = new Date();
  }

  setEnrichmentData(data: EnrichmentData): void {
    this.enrichmentData = data;
    this.updatedAt = new Date();
  }
}

