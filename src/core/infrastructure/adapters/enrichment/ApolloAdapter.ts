import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

export class ApolloAdapter implements IEnrichmentProvider {
  readonly name = "apollo";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.apollo.io/api/v1/people/match",
  ) {}

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    if (!context.email) {
      return { provider: this.name, fields: {}, missingSignals: ["email"] };
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
      },
      body: JSON.stringify({
        email: context.email,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apollo enrichment failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      person?: { title?: string; seniority?: string; linkedin_url?: string };
    };

    const person = payload.person ?? {};
    const fields: EnrichmentResult["fields"] = {};
    if (person.title) {
      fields.title = { value: person.title, confidence: 0.9, source: this.name };
    }
    if (person.seniority) {
      fields.seniority = { value: person.seniority, confidence: 0.85, source: this.name };
    }
    if (person.linkedin_url) {
      fields.linkedinUrl = { value: person.linkedin_url, confidence: 0.94, source: this.name };
    }

    return {
      provider: this.name,
      fields,
      missingSignals: Object.keys(fields).length === 0 ? ["title", "seniority"] : [],
    };
  }
}
