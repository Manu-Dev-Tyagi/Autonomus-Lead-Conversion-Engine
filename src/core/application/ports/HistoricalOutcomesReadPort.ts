export interface HistoricalOutcomesReadPort {
  getConversionRate(input: {
    tenantId: string;
    segmentKey: string;
  }): Promise<number | null>;
}
