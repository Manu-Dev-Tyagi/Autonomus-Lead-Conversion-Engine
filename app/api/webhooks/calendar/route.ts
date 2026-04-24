import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface CalendarWebhookPayload {
  tenantId?: string;
  leadId?: string;
  event?: string;
  meetingId?: string;
  startsAt?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service credentials are missing." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => ({}))) as CalendarWebhookPayload;
  if (!payload.tenantId || !payload.leadId || !payload.event) {
    return NextResponse.json(
      { error: "tenantId, leadId, and event are required." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("interactions").insert({
    tenant_id: payload.tenantId,
    lead_id: payload.leadId,
    type: "meeting",
    outcome: String(payload.event),
    payload,
    created_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json(
      { error: `Failed to process calendar webhook: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
