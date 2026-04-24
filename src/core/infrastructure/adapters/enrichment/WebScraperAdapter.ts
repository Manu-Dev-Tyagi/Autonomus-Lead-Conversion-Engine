import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export class WebScraperAdapter implements IEnrichmentProvider {
  readonly name = "web_scraper";

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    if (!context.websiteUrl) {
      return { provider: this.name, fields: {}, missingSignals: ["websiteUrl"] };
    }

    const response = await fetch(context.websiteUrl);
    if (!response.ok) {
      throw new Error(`Website enrichment failed (${response.status})`);
    }
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descriptionMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    );

    const fields: EnrichmentResult["fields"] = {};
    if (titleMatch?.[1]) {
      fields.websiteTitle = {
        value: stripTags(titleMatch[1]),
        confidence: 0.75,
        source: this.name,
      };
    }
    if (descriptionMatch?.[1]) {
      fields.websiteDescription = {
        value: stripTags(descriptionMatch[1]),
        confidence: 0.72,
        source: this.name,
      };
    }

    return {
      provider: this.name,
      fields,
      missingSignals: Object.keys(fields).length === 0 ? ["websiteTitle", "websiteDescription"] : [],
    };
  }
}
