import { apiRequest } from "@/lib/api/client";
import { FunnelMetricsResponse } from "@/lib/types/api";

export async function getFunnelMetrics(): Promise<FunnelMetricsResponse> {
  return apiRequest<FunnelMetricsResponse>(
    "/api/analytics/funnel",
    { method: "GET" },
    "Failed to load analytics funnel.",
  );
}
