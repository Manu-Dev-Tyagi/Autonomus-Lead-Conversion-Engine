import { apiRequest } from "@/lib/api/client";
import {
  ApprovalItem,
  ApproveDecisionRequest,
  RejectDecisionRequest,
} from "@/lib/types/api";

export async function listApprovals(): Promise<{ data: ApprovalItem[] }> {
  return apiRequest<{ data: ApprovalItem[] }>(
    "/api/approvals",
    { method: "GET" },
    "Failed to load approvals.",
  );
}

export async function approveDecision(
  approvalId: string,
  input: ApproveDecisionRequest = {},
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/api/approvals/${encodeURIComponent(approvalId)}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to approve decision.",
  );
}

export async function rejectDecision(
  approvalId: string,
  input: RejectDecisionRequest,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/api/approvals/${encodeURIComponent(approvalId)}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to reject decision.",
  );
}
