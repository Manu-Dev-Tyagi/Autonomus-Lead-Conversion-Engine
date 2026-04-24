import { AgentContextByAction, AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";

interface ScoringFactors {
  icpFit: number;
  intentSignals: number;
  enrichmentQuality: number;
  timingSensitivity: number;
}

export class ScoringAgentGatewayAdapter implements AgentGatewayPort {
  constructor(
    private readonly delegate: AgentGatewayPort,
    private readonly outcomesReader: HistoricalOutcomesReadPort,
  ) {}

  async execute<TAction extends AgentAction>(
    action: TAction,
    context: AgentContextByAction[TAction] & Record<string, unknown>,
  ): Promise<AgentDecision> {
    if (action !== AgentAction.ScoreLead) {
      return this.delegate.execute(action, context);
    }

    const scoringContext = context as AgentContextByAction[AgentAction.ScoreLead] & Record<string, unknown>;
    const factors = this.calculateFactors(scoringContext);
    const historicalConversionRate = await this.estimateHistoricalConversionRate(scoringContext);

    const decision = await this.delegate.execute(AgentAction.ScoreLead, {
      ...scoringContext,
      scores: factors,
      historicalConversionRate,
    });

    const aggregate = (factors.icpFit + factors.intentSignals + factors.enrichmentQuality + factors.timingSensitivity) / 4;
    const blendedConfidence = Math.max(0, Math.min(1, decision.confidence * 0.7 + (aggregate / 100) * 0.3));

    return {
      ...decision,
      confidence: blendedConfidence,
      metadata: {
        ...decision.metadata,
        scores: factors,
        historicalConversionRate,
      },
    };
  }

  private calculateFactors(context: Record<string, unknown>): ScoringFactors {
    const lead = this.readRecord(context.lead ?? context);
    const tenantConfig = this.readRecord(context.tenantConfig);
    const icpIndustries = this.readArray(tenantConfig.industries);
    const leadIndustry = typeof lead.industry === "string" ? lead.industry : "";
    const icpIndustryMatch = icpIndustries.includes(leadIndustry) ? 1 : 0;

    const intentSignals = this.readArray(lead.intentSignals).length;
    const nonEmptyLeadFields = Object.values(lead).filter((value) => value !== null && value !== undefined && value !== "").length;

    return {
      icpFit: this.bound(50 + icpIndustryMatch * 35),
      intentSignals: this.bound(40 + Math.min(40, intentSignals * 10)),
      enrichmentQuality: this.bound(Math.min(100, nonEmptyLeadFields * 8)),
      timingSensitivity: this.bound(55),
    };
  }

  private async estimateHistoricalConversionRate(context: Record<string, unknown>): Promise<number> {
    const tenantId = typeof context.tenantId === "string" ? context.tenantId : "default";
    const lead = this.readRecord(context.lead ?? context);
    const segmentKey = typeof lead.industry === "string" && lead.industry.trim() ? lead.industry : "default";
    const rateFromReader = await this.outcomesReader.getConversionRate({
      tenantId,
      segmentKey,
    });
    if (typeof rateFromReader === "number") {
      return Math.max(0, Math.min(1, rateFromReader));
    }

    const patterns = this.readArray(context.historicalPatterns);
    if (patterns.length > 0) {
      const rates = patterns
        .map((pattern) => this.readRecord(pattern).conversionRate)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (rates.length > 0) {
        const average = rates.reduce((sum, value) => sum + value, 0) / rates.length;
        return Math.max(0, Math.min(1, average));
      }
    }
    return 0.15;
  }

  private readRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object") {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private readArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private bound(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}
