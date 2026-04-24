import { apiRequest } from "@/lib/api/client";
import { AgentDecisionRecord } from "@/lib/types/api";

export async function listAgentDecisions(params?: {
  leadId?: string;
}): Promise<{ data: AgentDecisionRecord[] }> {
  const query = new URLSearchParams();
  if (params?.leadId) {
    query.set("leadId", params.leadId);
  }
  const url = `/api/agent-decisions${query.toString() ? `?${query.toString()}` : ""}`;
  return apiRequest<{ data: AgentDecisionRecord[] }>(
    url,
    { method: "GET" },
    "Failed to load agent decisions.",
  );
}
