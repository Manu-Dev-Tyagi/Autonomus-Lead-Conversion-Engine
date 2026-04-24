export interface TemplateCandidate {
  readonly id: string;
  readonly name: string;
  readonly segment: string;
  readonly sequenceStep: number;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
  readonly replyRate: number;
  readonly bookingRate: number;
}

export interface TemplateLibraryPort {
  getBestPerforming(input: {
    tenantId: string;
    segment: string;
    sequenceStep: number;
    limit?: number;
  }): Promise<TemplateCandidate[]>;
}
