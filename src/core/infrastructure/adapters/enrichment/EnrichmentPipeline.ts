import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class EnrichmentPipeline {
  constructor(private readonly providers: IEnrichmentProvider[]) {}

  async run(context: EnrichmentContext): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];
    for (const provider of this.providers) {
      results.push(await provider.enrich(context));
    }
    return results;
  }
}
