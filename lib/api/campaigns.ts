import { apiRequest } from "@/lib/api/client";

export interface CampaignRecord {
  id: string;
  tenantId: string;
  name: string;
  status: "draft";
  createdAt: string;
}

export interface ListCampaignsResponse {
  data: CampaignRecord[];
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
}

export interface CreateCampaignResponse {
  campaign: CampaignRecord;
}

export async function listCampaigns(): Promise<ListCampaignsResponse> {
  return apiRequest<ListCampaignsResponse>(
    "/api/campaigns",
    { method: "GET" },
    "Failed to load campaigns.",
  );
}

export async function createCampaign(
  input: CreateCampaignRequest,
): Promise<CreateCampaignResponse> {
  return apiRequest<CreateCampaignResponse>(
    "/api/campaigns",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to create campaign.",
  );
}
