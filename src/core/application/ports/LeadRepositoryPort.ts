import { Lead } from "@/src/core/domain/lead/Lead";
import { LeadId, TenantId } from "@/src/core/domain/shared/ids";

export interface LeadRepositoryPort {
  save(lead: Lead): Promise<void>;
  findById(tenantId: TenantId, leadId: LeadId): Promise<Lead | null>;
  findByEmail(tenantId: TenantId, email: string): Promise<Lead | null>;
}
