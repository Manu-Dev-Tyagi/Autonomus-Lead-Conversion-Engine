import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AgentDecisionRecord } from "@/lib/types/api";
import { createClient } from "@/utils/supabase/server";

interface DecisionRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  action: string;
  confidence: number | null;
  reasoning: string;
  alternatives: unknown[] | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  let query = supabase
    .from("agent_decisions")
    .select("id, tenant_id, lead_id, action, confidence, reasoning, alternatives, metadata, occurred_at")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Failed to fetch decisions: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as DecisionRow[];
  const response: AgentDecisionRecord[] = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    action: row.action,
    confidence: row.confidence,
    reasoning: row.reasoning,
    alternatives: row.alternatives ?? [],
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
  }));
  return NextResponse.json({ data: response });
}
