import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApprovalItem } from "@/lib/types/api";
import { createClient } from "@/utils/supabase/server";

interface DecisionRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  action: string;
  confidence: number | null;
  reasoning: string;
  occurred_at: string;
  lead: Array<{ email: string }> | { email: string } | null;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from("agent_decisions")
    .select("id, tenant_id, lead_id, action, confidence, reasoning, occurred_at, lead:leads(email)")
    .eq("tenant_id", tenantId)
    .lt("confidence", 0.85)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: `Failed to fetch approvals: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as DecisionRow[];
  const response: ApprovalItem[] = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    lead: {
      email:
        (Array.isArray(row.lead) ? row.lead[0]?.email : row.lead?.email) ??
        "unknown",
    },
    decision: {
      action: row.action,
      confidence: row.confidence,
      reasoning: row.reasoning,
    },
    status: "pending",
    createdAt: row.occurred_at,
  }));

  return NextResponse.json({ data: response });
}
