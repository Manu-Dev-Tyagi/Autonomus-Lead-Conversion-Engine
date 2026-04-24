import {
  EnrichmentContext,
  EnrichmentResult,
  IEnrichmentProvider,
} from "@/src/core/infrastructure/adapters/enrichment/IEnrichmentProvider";

interface CacheEntry {
  readonly expiresAtMs: number;
  readonly result: EnrichmentResult;
}

export class CachedEnrichmentProvider implements IEnrichmentProvider {
  readonly name: string;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly delegate: IEnrichmentProvider,
    private readonly ttlMs: number = 5 * 60 * 1000,
  ) {
    this.name = `cached_${delegate.name}`;
  }

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const key = this.buildKey(context);
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAtMs > now) {
      return cached.result;
    }

    const result = await this.delegate.enrich(context);
    this.cache.set(key, {
      expiresAtMs: now + this.ttlMs,
      result,
    });
    return result;
  }

  private buildKey(context: EnrichmentContext): string {
    return JSON.stringify({
      provider: this.delegate.name,
      tenantId: context.tenantId,
      leadId: context.leadId,
      email: context.email ?? "",
      companyDomain: context.companyDomain ?? "",
      websiteUrl: context.websiteUrl ?? "",
      companyName: context.companyName ?? "",
    });
  }
}
