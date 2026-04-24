import { apiRequest } from "@/lib/api/client";

export interface OperationsMetricsResponse {
  data: {
    tenantId: string;
    successCount: number;
    failureCount: number;
    lastUpdatedAt: string;
  };
}

export async function getOperationsMetrics(): Promise<OperationsMetricsResponse> {
  return apiRequest<OperationsMetricsResponse>(
    "/api/operations/metrics",
    { method: "GET" },
    "Failed to load operations metrics.",
  );
}
