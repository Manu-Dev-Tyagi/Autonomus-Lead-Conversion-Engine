import {
  InteractionDirection,
  InteractionType,
} from "@/src/core/domain/interaction/InteractionType";
import { InteractionId, LeadId, TenantId } from "@/src/core/domain/shared/ids";

export class Interaction {
  private constructor(
    public readonly id: InteractionId,
    public readonly tenantId: TenantId,
    public readonly leadId: LeadId,
    public readonly type: InteractionType,
    public readonly direction: InteractionDirection,
    public readonly occurredAtIso: string,
    public readonly content: string | null,
  ) {}

  static create(input: {
    id: InteractionId;
    tenantId: TenantId;
    leadId: LeadId;
    type: InteractionType;
    direction: InteractionDirection;
    occurredAtIso: string;
    content?: string | null;
  }): Interaction {
    if (!input.occurredAtIso || Number.isNaN(Date.parse(input.occurredAtIso))) {
      throw new Error("Interaction timestamp is invalid.");
    }

    return new Interaction(
      input.id,
      input.tenantId,
      input.leadId,
      input.type,
      input.direction,
      input.occurredAtIso,
      input.content ?? null,
    );
  }
}
