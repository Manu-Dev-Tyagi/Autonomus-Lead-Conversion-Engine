import { TenantId } from "@/src/core/domain/shared/ids";

export enum TenantPlan {
  Free = "free",
  Starter = "starter",
  Pro = "pro",
  Enterprise = "enterprise",
}

export enum TenantStatus {
  Active = "active",
  Suspended = "suspended",
  Cancelled = "cancelled",
}

export class Tenant {
  private constructor(
    public readonly id: TenantId,
    public readonly name: string,
    public readonly slug: string,
    public readonly plan: TenantPlan,
    public readonly status: TenantStatus,
    public readonly industry: string | null,
    public readonly companySize: string | null,
    public readonly config: Record<string, any>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id: TenantId;
    name: string;
    slug: string;
    plan?: TenantPlan;
    status?: TenantStatus;
    industry?: string | null;
    companySize?: string | null;
    config?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
  }): Tenant {
    return new Tenant(
      input.id,
      input.name,
      input.slug.toLowerCase(),
      input.plan ?? TenantPlan.Free,
      input.status ?? TenantStatus.Active,
      input.industry ?? null,
      input.companySize ?? null,
      input.config ?? {},
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date()
    );
  }
}
