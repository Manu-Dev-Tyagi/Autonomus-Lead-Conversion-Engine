export interface SequencePerformanceSnapshot {
  readonly sequenceId: string;
  readonly segmentKey: string;
  readonly replyRate: number;
  readonly bookingRate: number;
  readonly sampleSize: number;
}

export interface StrategyPerformancePort {
  getSequencePerformance(input: {
    tenantId: string;
    segmentKey: string;
    sequenceIds: string[];
  }): Promise<SequencePerformanceSnapshot[]>;
}
