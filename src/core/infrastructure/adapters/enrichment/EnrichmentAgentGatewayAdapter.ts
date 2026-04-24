import { AgentContextByAction, AgentGatewayPort } from "@/src/core/application/ports/AgentGatewayPort";
import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { AgentDecision } from "@/src/core/domain/agent/AgentDecision";
import { EnrichmentPipeline } from "@/src/core/infrastructure/adapters/enrichment/EnrichmentPipeline";
import {
  EnrichedField,
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class EnrichmentAgentGatewayAdapter implements AgentGatewayPort {
  private readonly pipeline: EnrichmentPipeline;

  constructor(
    providers: IEnrichmentProvider[],
    private readonly fallback: AgentGatewayPort,
  ) {
    this.pipeline = new EnrichmentPipeline(providers);
  }

  async execute<TAction extends AgentAction>(
    action: TAction,
    context: AgentContextByAction[TAction] & Record<string, unknown>,
  ): Promise<AgentDecision> {
    if (action !== AgentAction.EnrichLead) {
      return this.fallback.execute(action, context);
    }

    const enrichmentContext = context as AgentContextByAction[AgentAction.EnrichLead] & Record<string, unknown>;
    const providerResults = await this.pipeline.run({
      tenantId: enrichmentContext.tenantId,
      leadId: enrichmentContext.leadId,
      email: enrichmentContext.email,
      companyDomain: typeof enrichmentContext.companyDomain === "string" ? enrichmentContext.companyDomain : undefined,
      websiteUrl: typeof enrichmentContext.websiteUrl === "string" ? enrichmentContext.websiteUrl : undefined,
      companyName: typeof enrichmentContext.companyName === "string" ? enrichmentContext.companyName : undefined,
    });
    const mergedFields = this.mergeFields(providerResults);
    const confidence = this.calculateConfidence(mergedFields);
    const missingSignals = providerResults.flatMap((result) => result.missingSignals);

    return {
      action: AgentAction.EnrichLead,
      confidence,
      reasoning: `Enrichment aggregated from ${providerResults.length} provider(s).`,
      alternatives: [],
      metadata: {
        enrichedFields: this.flattenFields(mergedFields),
        missingSignals,
        providerResults,
      },
    };
  }

  private mergeFields(results: EnrichmentResult[]): Record<string, EnrichedField> {
    const merged: Record<string, EnrichedField> = {};
    for (const result of results) {
      for (const [key, field] of Object.entries(result.fields)) {
        const existing = merged[key];
        if (!existing || field.confidence >= existing.confidence) {
          merged[key] = field;
        }
      }
    }
    return merged;
  }

  private flattenFields(fields: Record<string, EnrichedField>): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(fields)) {
      flattened[key] = field.value;
    }
    return flattened;
  }

  private calculateConfidence(fields: Record<string, EnrichedField>): number {
    const values = Object.values(fields).map((field) => field.confidence);
    if (values.length === 0) {
      return 0.4;
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.max(0, Math.min(1, average));
  }
}
