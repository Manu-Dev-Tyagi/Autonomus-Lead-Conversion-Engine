import { apiRequest } from "@/lib/api/client";

export interface WorkspaceSummary {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: "provisioning" | "active" | "suspended" | "archived" | "failed";
  industry?: string | null;
  companySize?: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt?: string;
}

export async function listAdminWorkspaces(): Promise<{ data: WorkspaceSummary[] }> {
  return apiRequest<{ data: WorkspaceSummary[] }>(
    "/api/admin/workspaces",
    { method: "GET" },
    "Failed to load workspaces.",
  );
}

export async function createAdminWorkspace(input: {
  name: string;
  slug: string;
  ownerUserId: string;
  industry?: string;
  companySize?: string;
  idempotencyKey?: string;
  configOverrides?: Record<string, unknown>;
}): Promise<{ workspace: WorkspaceSummary; idempotentReplay?: boolean }> {
  return apiRequest<{ workspace: WorkspaceSummary; idempotentReplay?: boolean }>(
    "/api/admin/workspaces",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to create workspace.",
  );
}
