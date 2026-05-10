import { CircuitBreaker } from "@/src/core/application/services/CircuitBreaker";
import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class EnrichmentPipeline {
  private readonly circuitBreakers: Map<string, CircuitBreaker>;

  constructor(private readonly providers: IEnrichmentProvider[]) {
    this.circuitBreakers = new Map(
      providers.map((p) => [p.name, new CircuitBreaker(5, 60000, 2)]),
    );
  }

  async run(context: EnrichmentContext): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];
    const clearbitFloor = Number(process.env.ALE_ENRICHMENT_CLEARBIT_CONFIDENCE_FLOOR ?? 0.80);
    const apolloFloor = Number(process.env.ALE_ENRICHMENT_APOLLO_CONFIDENCE_FLOOR ?? 0.70);

    for (const provider of this.providers) {
      const breaker = this.circuitBreakers.get(provider.name);
      try {
        const result = await (breaker 
          ? breaker.run(() => provider.enrich(context))
          : provider.enrich(context));
        
        results.push(result);

        // Calculate current confidence to see if we can stop early
        const currentConf = this.getAggregateConfidence(result);
        
        if (provider.name === "clearbit" && currentConf >= clearbitFloor) break;
        if (provider.name === "apollo" && currentConf >= apolloFloor) break;
        // Gemini inference is always last, no early break needed
      } catch (error) {
        // Log error but continue to next provider for resilience
        console.error(`Provider ${provider.name} failed:`, error);
      }
    }
    return results;
  }

  private getAggregateConfidence(result: EnrichmentResult): number {
    const values = Object.values(result.fields).map(f => f.confidence);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
