export interface TemplateRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly segment: string;
  readonly sequenceStep: number;
  readonly name: string;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
  readonly replyRate: number;
  readonly bookingRate: number;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTemplateInput {
  readonly tenantId: string;
  readonly segment: string;
  readonly sequenceStep: number;
  readonly name: string;
  readonly subjectTemplate: string;
  readonly bodyTemplate: string;
}

export class TemplateRepository {
  private readonly templates = new Map<string, TemplateRecord>();

  create(input: CreateTemplateInput): TemplateRecord {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const template: TemplateRecord = {
      id,
      tenantId: input.tenantId,
      segment: input.segment,
      sequenceStep: input.sequenceStep,
      name: input.name,
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
      replyRate: 0,
      bookingRate: 0,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(id, template);
    return template;
  }

  upsert(template: TemplateRecord): TemplateRecord {
    this.templates.set(template.id, template);
    return template;
  }

  findById(id: string): TemplateRecord | null {
    return this.templates.get(id) ?? null;
  }

  delete(id: string): boolean {
    return this.templates.delete(id);
  }

  listByTenant(tenantId: string): TemplateRecord[] {
    return Array.from(this.templates.values()).filter((template) => template.tenantId === tenantId);
  }

  getBestPerforming(tenantId: string, segment: string, sequenceStep: number, limit = 5): TemplateRecord[] {
    return this.listByTenant(tenantId)
      .filter((template) => template.segment === segment && template.sequenceStep === sequenceStep)
      .sort((left, right) => this.scoreTemplate(right) - this.scoreTemplate(left))
      .slice(0, limit);
  }

  private scoreTemplate(template: TemplateRecord): number {
    return template.replyRate * 0.6 + template.bookingRate * 0.4;
  }
}
