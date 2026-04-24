import {
  SequencePerformanceSnapshot,
  StrategyPerformancePort,
} from "@/src/core/application/ports/StrategyPerformancePort";

export class InMemoryStrategyPerformanceAdapter implements StrategyPerformancePort {
  private readonly snapshots: SequencePerformanceSnapshot[];

  constructor(seed: SequencePerformanceSnapshot[] = []) {
    this.snapshots = [...seed];
  }

  async getSequencePerformance(input: {
    tenantId: string;
    segmentKey: string;
    sequenceIds: string[];
  }): Promise<SequencePerformanceSnapshot[]> {
    const requested = new Set(input.sequenceIds);
    const bySegment = this.snapshots.filter(
      (snapshot) =>
        snapshot.segmentKey === input.segmentKey && requested.has(snapshot.sequenceId),
    );

    return input.sequenceIds.map((sequenceId) => {
      const existing = bySegment.find((snapshot) => snapshot.sequenceId === sequenceId);
      return (
        existing ?? {
          sequenceId,
          segmentKey: input.segmentKey,
          replyRate: 0.1,
          bookingRate: 0.03,
          sampleSize: 0,
        }
      );
    });
  }
}
