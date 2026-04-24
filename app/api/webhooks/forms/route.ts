import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface FormWebhookPayload {
  tenantId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service credentials are missing." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as FormWebhookPayload;
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!tenantId || !isValidEmail(email)) {
    return NextResponse.json({ error: "tenantId and valid email are required." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: tenantId,
      email,
      state: "new",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: `Failed to process form webhook: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true, leadId: data.id }, { status: 201 });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
