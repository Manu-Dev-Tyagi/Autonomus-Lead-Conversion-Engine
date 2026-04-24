import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { InteractionRecord } from "@/lib/types/api";
import { createClient } from "@/utils/supabase/server";

interface InteractionRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  type: string;
  outcome: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
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
    .from("interactions")
    .select("id, tenant_id, lead_id, type, outcome, payload, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Failed to fetch interactions: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as InteractionRow[];
  const response: InteractionRecord[] = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    leadId: row.lead_id,
    type: row.type,
    outcome: row.outcome,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  }));
  return NextResponse.json({ data: response });
}
