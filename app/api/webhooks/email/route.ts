import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface EmailWebhookEvent {
  tenantId?: string;
  leadId?: string;
  event?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service credentials are missing." }, { status: 500 });
  }

  const events = (await request.json().catch(() => [])) as EmailWebhookEvent[];
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "Webhook payload must be an array." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const event of events) {
    if (!event.tenantId || !event.leadId || !event.event) {
      continue;
    }
    const outcome = String(event.event);
    const createdAt =
      typeof event.timestamp === "number"
        ? new Date(event.timestamp * 1000).toISOString()
        : new Date().toISOString();
    const { error } = await supabase.from("interactions").insert({
      tenant_id: event.tenantId,
      lead_id: event.leadId,
      type: "email",
      outcome,
      payload: event,
      created_at: createdAt,
    });
    if (error) {
      return NextResponse.json({ error: `Failed to process email webhook: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
