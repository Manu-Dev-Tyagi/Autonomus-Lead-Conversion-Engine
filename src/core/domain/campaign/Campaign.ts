import { CampaignId, TenantId } from "@/src/core/domain/shared/ids";

export interface CampaignStep {
  readonly order: number;
  readonly delayHours: number;
  readonly templateId: string;
}

export class Campaign {
  private constructor(
    public readonly id: CampaignId,
    public readonly tenantId: TenantId,
    public readonly name: string,
    public readonly steps: CampaignStep[],
  ) {}

  static create(input: {
    id: CampaignId;
    tenantId: TenantId;
    name: string;
    steps: CampaignStep[];
  }): Campaign {
    if (!input.name.trim()) {
      throw new Error("Campaign name is required.");
    }
    if (input.steps.length === 0) {
      throw new Error("Campaign requires at least one step.");
    }

    const sorted = [...input.steps].sort((a, b) => a.order - b.order);
    for (let index = 0; index < sorted.length; index += 1) {
      const step = sorted[index];
      if (step.order !== index + 1) {
        throw new Error("Campaign step orders must be sequential starting at 1.");
      }
      if (step.delayHours < 0) {
        throw new Error("Campaign step delay cannot be negative.");
      }
      if (!step.templateId.trim()) {
        throw new Error("Campaign step template is required.");
      }
    }

    return new Campaign(input.id, input.tenantId, input.name.trim(), sorted);
  }
}
