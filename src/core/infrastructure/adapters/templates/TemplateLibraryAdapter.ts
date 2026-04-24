import {
  TemplateCandidate,
  TemplateLibraryPort,
} from "@/src/core/application/ports/TemplateLibraryPort";
import { TemplatePerformancePort } from "@/src/core/application/ports/TemplatePerformancePort";
import {
  TemplatePerformanceTracker,
} from "@/src/core/infrastructure/adapters/templates/TemplatePerformanceTracker";
import {
  TemplateRecord,
  TemplateRepository,
} from "@/src/core/infrastructure/adapters/templates/TemplateRepository";

export class TemplateLibraryAdapter implements TemplateLibraryPort, TemplatePerformancePort {
  constructor(
    private readonly repository: TemplateRepository,
    private readonly tracker: TemplatePerformanceTracker,
  ) {}

  async getBestPerforming(input: {
    tenantId: string;
    segment: string;
    sequenceStep: number;
    limit?: number;
  }): Promise<TemplateCandidate[]> {
    const templates = this.repository.getBestPerforming(
      input.tenantId,
      input.segment,
      input.sequenceStep,
      input.limit ?? 5,
    );
    return templates.map((template) => this.toCandidate(template));
  }

  async recordOutcome(input: { templateId: string; replied: boolean; booked: boolean }): Promise<void> {
    this.tracker.record(input);
  }

  private toCandidate(template: TemplateRecord): TemplateCandidate {
    return {
      id: template.id,
      name: template.name,
      segment: template.segment,
      sequenceStep: template.sequenceStep,
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      replyRate: template.replyRate,
      bookingRate: template.bookingRate,
    };
  }
}
