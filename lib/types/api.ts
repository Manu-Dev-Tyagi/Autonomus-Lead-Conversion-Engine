export type LeadState =
  | "new"
  | "enriching"
  | "enriched"
  | "scoring"
  | "qualified"
  | "disqualified"
  | "outreach"
  | "replied"
  | "booked"
  | "converted"
  | "lost";

export interface LeadListItem {
  id: string;
  tenantId: string;
  email: string;
  state: LeadState;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadRequest {
  email: string;
}

export interface CreateLeadResponse {
  lead: LeadListItem;
  processing?: boolean;
}

export interface UpdateLeadRequest {
  email?: string;
  state?: LeadState;
  score?: number | null;
}

export interface UpdateLeadResponse {
  lead: LeadListItem;
}

export interface LeadDetailResponse {
  lead: LeadListItem;
  interactions: Array<{
    id: string;
    type: string;
    outcome: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  decisions: Array<{
    id: string;
    action: string;
    confidence: number | null;
    reasoning: string;
    occurredAt: string;
  }>;
}

export interface InteractionRecord {
  id: string;
  tenantId: string;
  leadId: string;
  type: string;
  outcome: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AgentDecisionRecord {
  id: string;
  tenantId: string;
  leadId: string;
  action: string;
  confidence: number | null;
  reasoning: string;
  alternatives: unknown[];
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface ApprovalItem {
  id: string;
  tenantId: string;
  leadId: string;
  lead: {
    email: string;
  };
  decision: {
    action: string;
    confidence: number | null;
    reasoning: string;
  };
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ApproveDecisionRequest {
  notes?: string;
}

export interface RejectDecisionRequest {
  reason: string;
  notes?: string;
}

export interface FunnelMetricsResponse {
  tenantId: string;
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    outreachSent: number;
    replied: number;
    booked: number;
    converted: number;
    qualificationRate: number;
    replyRate: number;
    bookingRate: number;
    conversionRate: number;
  };
  byState: Record<string, number>;
}

export interface ListLeadsResponse {
  data: LeadListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  error: string;
}
