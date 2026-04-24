import { AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { ExperimentAssignmentPort } from "@/src/core/application/ports/ExperimentAssignmentPort";
import { SequenceDefinition, SequenceLibraryPort } from "@/src/core/application/ports/SequenceLibraryPort";
import {
  SequencePerformanceSnapshot,
  StrategyPerformancePort,
} from "@/src/core/application/ports/StrategyPerformancePort";
import { SequencePlan, StrategyPlannerPort } from "@/src/core/application/ports/StrategyPlannerPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";

export class StrategyPlannerAdapter implements StrategyPlannerPort {
  constructor(
    private readonly sequenceLibrary: SequenceLibraryPort,
    private readonly performance: StrategyPerformancePort,
    private readonly experiments: ExperimentAssignmentPort,
    private readonly agentGateway: AgentGatewayPort,
  ) {}

  async plan(input: { tenantId: string; leadId: string; leadEmail?: string }): Promise<SequencePlan> {
    const sequences = await this.sequenceLibrary.listByTenant(input.tenantId);
    if (sequences.length === 0) {
      throw new Error("No outreach sequences configured for tenant.");
    }

    const segmentKey = this.buildSegmentKey(input.leadEmail);
    const sequenceIds = sequences.map((sequence) => sequence.id);
    const snapshots = await this.performance.getSequencePerformance({
      tenantId: input.tenantId,
      segmentKey,
      sequenceIds,
    });

    const fallbackRanked = this.rankByPerformance(sequences, snapshots);
    const shortList = fallbackRanked.slice(0, 2);
    const experimentVariant =
      shortList.length > 1
        ? await this.experiments.assign({
            tenantId: input.tenantId,
            experimentKey: `sequence_selector:${segmentKey}`,
            subjectId: input.leadId,
            variants: shortList.map((item) => item.id),
          })
        : shortList[0].id;

    try {
      const decision = await this.agentGateway.execute(AgentAction.PlanSequence, {
        tenantId: input.tenantId,
        leadId: input.leadId,
        leadEmail: input.leadEmail,
        segmentKey,
        availableSequences: sequences,
        historicalPerformance: snapshots,
        abExperiment: {
          experimentKey: `sequence_selector:${segmentKey}`,
          variant: experimentVariant,
        },
      });
      const metadata = this.getMetadata(decision.metadata);
      const selectedId =
        typeof metadata.sequenceId === "string" && metadata.sequenceId.length > 0
          ? metadata.sequenceId
          : experimentVariant;
      const selected = sequences.find((sequence) => sequence.id === selectedId) ?? shortList[0];
      const expectedReplyRate = this.getExpectedReplyRate(selected.id, snapshots);
      return {
        sequenceId: selected.id,
        step: 1,
        channel: selected.channel,
        expectedReplyRate,
        experimentVariant,
      };
    } catch {
      const selected = sequences.find((sequence) => sequence.id === experimentVariant) ?? shortList[0];
      return {
        sequenceId: selected.id,
        step: 1,
        channel: selected.channel,
        expectedReplyRate: this.getExpectedReplyRate(selected.id, snapshots),
        experimentVariant,
      };
    }
  }

  private rankByPerformance(
    sequences: SequenceDefinition[],
    snapshots: SequencePerformanceSnapshot[],
  ): SequenceDefinition[] {
    const byId = new Map(snapshots.map((snapshot) => [snapshot.sequenceId, snapshot]));
    return [...sequences].sort((left, right) => {
      const leftScore = this.weightedScore(byId.get(left.id));
      const rightScore = this.weightedScore(byId.get(right.id));
      return rightScore - leftScore;
    });
  }

  private weightedScore(snapshot?: SequencePerformanceSnapshot): number {
    if (!snapshot) {
      return 0;
    }
    return snapshot.replyRate * 0.6 + snapshot.bookingRate * 0.4;
  }

  private buildSegmentKey(email?: string): string {
    if (!email || !email.includes("@")) {
      return "default";
    }
    return email.split("@")[1].toLowerCase();
  }

  private getExpectedReplyRate(
    sequenceId: string,
    snapshots: SequencePerformanceSnapshot[],
  ): number | undefined {
    return snapshots.find((snapshot) => snapshot.sequenceId === sequenceId)?.replyRate;
  }

  private getMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    if (typeof metadata.metadata === "object" && metadata.metadata) {
      return metadata.metadata as Record<string, unknown>;
    }
    return metadata;
  }
}
