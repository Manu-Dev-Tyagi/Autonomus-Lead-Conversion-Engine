export interface TemplatePerformancePort {
  recordOutcome(input: {
    templateId: string;
    replied: boolean;
    booked: boolean;
  }): Promise<void>;
}
