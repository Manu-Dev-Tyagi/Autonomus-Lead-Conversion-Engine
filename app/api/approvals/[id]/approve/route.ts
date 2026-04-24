import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  const body = (await request.json().catch(() => ({}))) as { notes?: string };
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: user.id,
    action: "approval.approved",
    entity_type: "agent_decision",
    entity_id: id,
    metadata: { notes: body.notes ?? null },
  });
  if (error) {
    return NextResponse.json({ error: `Failed to approve decision: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
