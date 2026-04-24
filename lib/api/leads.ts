import { apiRequest } from "@/lib/api/client";
import {
  CreateLeadRequest,
  CreateLeadResponse,
  LeadDetailResponse,
  ListLeadsResponse,
  UpdateLeadRequest,
  UpdateLeadResponse,
} from "@/lib/types/api";

export async function listLeads(params?: {
  page?: number;
  pageSize?: number;
  state?: string;
  search?: string;
}): Promise<ListLeadsResponse> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }
  if (params?.state) {
    query.set("state", params.state);
  }
  if (params?.search) {
    query.set("search", params.search);
  }

  const url = `/api/leads${query.toString() ? `?${query.toString()}` : ""}`;
  return apiRequest<ListLeadsResponse>(url, { method: "GET" }, "Failed to load leads.");
}

export async function createLead(input: CreateLeadRequest): Promise<CreateLeadResponse> {
  return apiRequest<CreateLeadResponse>(
    "/api/leads",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to create lead.",
  );
}

export async function getLead(leadId: string): Promise<LeadDetailResponse> {
  return apiRequest<LeadDetailResponse>(
    `/api/leads/${encodeURIComponent(leadId)}`,
    { method: "GET" },
    "Failed to load lead.",
  );
}

export async function updateLead(
  leadId: string,
  input: UpdateLeadRequest,
): Promise<UpdateLeadResponse> {
  return apiRequest<UpdateLeadResponse>(
    `/api/leads/${encodeURIComponent(leadId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to update lead.",
  );
}
