import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

interface CampaignAuditRow {
  id: string;
  tenant_id: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
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
    .from("audit_logs")
    .select("id, tenant_id, entity_id, metadata, created_at")
    .eq("tenant_id", tenantId)
    .eq("entity_type", "campaign")
    .eq("action", "campaign.created")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: `Failed to fetch campaigns: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as CampaignAuditRow[];
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.entity_id ?? row.id,
      tenantId: row.tenant_id ?? tenantId,
      name: String(row.metadata?.name ?? "Untitled Campaign"),
      status: "draft",
      createdAt: row.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; description?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  }

  const campaignId = crypto.randomUUID();
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: user.id,
    action: "campaign.created",
    entity_type: "campaign",
    entity_id: campaignId,
    metadata: {
      name,
      description: typeof body.description === "string" ? body.description : null,
    },
  });
  if (error) {
    return NextResponse.json({ error: `Failed to create campaign: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json(
    {
      campaign: {
        id: campaignId,
        tenantId,
        name,
        status: "draft",
      },
    },
    { status: 201 },
  );
}
