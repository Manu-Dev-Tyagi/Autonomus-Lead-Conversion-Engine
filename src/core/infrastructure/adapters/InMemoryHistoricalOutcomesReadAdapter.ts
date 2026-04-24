import { HistoricalOutcomesReadPort } from "@/src/core/application/ports/HistoricalOutcomesReadPort";

export class InMemoryHistoricalOutcomesReadAdapter implements HistoricalOutcomesReadPort {
  private readonly rates = new Map<string, number>();

  constructor(seed: Array<{ tenantId: string; segmentKey: string; conversionRate: number }> = []) {
    for (const item of seed) {
      this.rates.set(this.buildKey(item.tenantId, item.segmentKey), this.bound(item.conversionRate));
    }
  }

  async getConversionRate(input: { tenantId: string; segmentKey: string }): Promise<number | null> {
    const value = this.rates.get(this.buildKey(input.tenantId, input.segmentKey));
    return value ?? null;
  }

  upsert(input: { tenantId: string; segmentKey: string; conversionRate: number }): void {
    this.rates.set(this.buildKey(input.tenantId, input.segmentKey), this.bound(input.conversionRate));
  }

  private buildKey(tenantId: string, segmentKey: string): string {
    return `${tenantId}::${segmentKey}`;
  }

  private bound(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
