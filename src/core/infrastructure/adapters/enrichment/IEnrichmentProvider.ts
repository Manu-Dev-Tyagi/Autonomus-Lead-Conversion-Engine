export interface EnrichmentContext {
  readonly tenantId: string;
  readonly leadId: string;
  readonly email?: string;
  readonly companyDomain?: string;
  readonly websiteUrl?: string;
  readonly companyName?: string;
}

export interface EnrichedField {
  readonly value: unknown;
  readonly confidence: number;
  readonly source: string;
}

export interface EnrichmentResult {
  readonly provider: string;
  readonly fields: Record<string, EnrichedField>;
  readonly missingSignals: string[];
}

export interface IEnrichmentProvider {
  readonly name: string;
  enrich(context: EnrichmentContext): Promise<EnrichmentResult>;
}
