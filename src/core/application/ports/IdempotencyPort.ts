export interface IdempotencyResult {
  readonly status:
    | "qualified"
    | "disqualified"
    | "outreach_sent"
    | "booked"
    | "no_booking"
    | "pending_approval";
  readonly leadId: string;
  readonly score: number;
}

export interface IdempotencyStartResult {
  readonly started: boolean;
  readonly existingResult?: IdempotencyResult;
}

export interface IdempotencyPort {
  tryStart(key: string): Promise<IdempotencyStartResult>;
  complete(key: string, result: IdempotencyResult): Promise<void>;
}
