import { AgentAction } from "@/src/core/domain/agent/AgentAction";
import { GeminiEnrichmentAgent } from "@/src/core/infrastructure/adapters/gemini/EnrichmentAgent";
import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class GeminiInferenceAdapter implements IEnrichmentProvider {
  readonly name = "gemini_inference";
  private readonly agent: GeminiEnrichmentAgent;

  constructor(apiKey: string, model?: string) {
    this.agent = new GeminiEnrichmentAgent(apiKey, model);
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const decision = await this.agent.execute(
      AgentAction.EnrichLead,
      context as unknown as Record<string, unknown>,
    );
    const metadata = this.readMetadata(decision.metadata);
    const enrichedFields = this.toEnrichedFields(metadata.enrichedFields);
    return {
      provider: this.name,
      fields: enrichedFields,
      missingSignals: Array.isArray(metadata.missingSignals)
        ? metadata.missingSignals.filter((value): value is string => typeof value === "string")
        : [],
    };
  }

  private readMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    if (typeof metadata.metadata === "object" && metadata.metadata) {
      return metadata.metadata as Record<string, unknown>;
    }
    return metadata;
  }

  private toEnrichedFields(value: unknown): EnrichmentResult["fields"] {
    if (!value || typeof value !== "object") {
      return {};
    }
    const input = value as Record<string, unknown>;
    const output: EnrichmentResult["fields"] = {};
    for (const [key, fieldValue] of Object.entries(input)) {
      output[key] = {
        value: fieldValue,
        confidence: 0.78,
        source: this.name,
      };
    }
    return output;
  }
}
