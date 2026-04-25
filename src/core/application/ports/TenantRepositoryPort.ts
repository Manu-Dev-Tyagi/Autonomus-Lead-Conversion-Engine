import { Tenant } from "@/src/core/domain/shared/Tenant";
import { TenantId } from "@/src/core/domain/shared/ids";

export interface TenantRepositoryPort {
  save(tenant: Tenant): Promise<void>;
  findById(id: TenantId): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  addMembership(tenantId: TenantId, userId: string, role: string): Promise<void>;
}
