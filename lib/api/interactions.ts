import { apiRequest } from "@/lib/api/client";
import { InteractionRecord } from "@/lib/types/api";

export async function listInteractions(params?: {
  leadId?: string;
}): Promise<{ data: InteractionRecord[] }> {
  const query = new URLSearchParams();
  if (params?.leadId) {
    query.set("leadId", params.leadId);
  }
  const url = `/api/interactions${query.toString() ? `?${query.toString()}` : ""}`;
  return apiRequest<{ data: InteractionRecord[] }>(
    url,
    { method: "GET" },
    "Failed to load interactions.",
  );
}
