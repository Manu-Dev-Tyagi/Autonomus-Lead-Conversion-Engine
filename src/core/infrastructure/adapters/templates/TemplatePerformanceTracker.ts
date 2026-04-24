import { TemplateRecord, TemplateRepository } from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

export interface TemplateOutcomeEvent {
  readonly templateId: string;
  readonly replied: boolean;
  readonly booked: boolean;
}

export class TemplatePerformanceTracker {
  private readonly stats = new Map<
    string,
    {
      sent: number;
      replied: number;
      booked: number;
    }
  >();

  constructor(private readonly templateRepository: TemplateRepository) {}

  record(event: TemplateOutcomeEvent): TemplateRecord {
    const template = this.templateRepository.findById(event.templateId);
    if (!template) {
      throw new Error(`Template not found: ${event.templateId}`);
    }

    const previous = this.stats.get(event.templateId) ?? { sent: 0, replied: 0, booked: 0 };
    const next = {
      sent: previous.sent + 1,
      replied: previous.replied + (event.replied ? 1 : 0),
      booked: previous.booked + (event.booked ? 1 : 0),
    };
    this.stats.set(event.templateId, next);

    const updated: TemplateRecord = {
      ...template,
      usageCount: next.sent,
      replyRate: next.sent === 0 ? 0 : next.replied / next.sent,
      bookingRate: next.sent === 0 ? 0 : next.booked / next.sent,
      updatedAt: new Date().toISOString(),
    };
    return this.templateRepository.upsert(updated);
  }
}
