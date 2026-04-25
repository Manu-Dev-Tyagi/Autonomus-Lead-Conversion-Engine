import { EntityId } from "@/src/core/domain/shared/EntityId";

export class TenantId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class LeadId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class InteractionId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class CampaignId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class WorkspaceId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class WorkspaceConfigId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}

export class ProvisioningJobId extends EntityId {
  constructor(value: string) {
    super(value);
  }
}
