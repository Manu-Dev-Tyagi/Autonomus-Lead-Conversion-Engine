import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class ClearbitAdapter implements IEnrichmentProvider {
  readonly name = "clearbit";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://company.clearbit.com/v2/companies/find",
  ) {}

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    if (!context.companyDomain) {
      return { provider: this.name, fields: {}, missingSignals: ["companyDomain"] };
    }

    const url = `${this.baseUrl}?domain=${encodeURIComponent(context.companyDomain)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Clearbit enrichment failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      category?: { industry?: string };
      metrics?: { employees?: number };
      location?: string;
    };

    const fields: EnrichmentResult["fields"] = {};
    if (payload.category?.industry) {
      fields.industry = {
        value: payload.category.industry,
        confidence: 0.92,
        source: this.name,
      };
    }
    if (typeof payload.metrics?.employees === "number") {
      fields.companySize = {
        value: payload.metrics.employees,
        confidence: 0.9,
        source: this.name,
      };
    }
    if (payload.location) {
      fields.location = {
        value: payload.location,
        confidence: 0.86,
        source: this.name,
      };
    }

    return {
      provider: this.name,
      fields,
      missingSignals: Object.keys(fields).length === 0 ? ["industry", "companySize"] : [],
    };
  }
}
