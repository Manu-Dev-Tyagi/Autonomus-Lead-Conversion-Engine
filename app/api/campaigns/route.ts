import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });
  }

  // Fetch from the actual campaigns table
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("campaigns")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: `Failed to fetch campaigns: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      status: row.status,
      config: row.config,
      stats: row.stats,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  }

  const admin = getAdminClient();

  // Extract targeting config from body
  const config = (body.config || {}) as Record<string, any>;
  const targeting = config.targeting || {};
  const automation = config.automation || {};

  // Insert into the actual campaigns table with dedicated ICP columns
  const { data: campaign, error: insertErr } = await admin
    .from("campaigns")
    .insert({
      tenant_id: tenantId,
      name,
      description: typeof body.description === "string" ? body.description : null,
      status: "draft",
      config,
      target_industries: targeting.industries || [],
      target_company_sizes: targeting.companySizes || [],
      target_titles: targeting.titles || [],
      target_locations: targeting.locations || [],
      min_score: targeting.minScore || 0,
      auto_enroll: automation.autoEnroll || false,
      confidence_threshold: automation.confidenceThreshold || 0.75,
      approval_required_below: automation.approvalRequiredBelow || 0.70,
      sequence_steps: config.sequence || [],
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: `Failed to create campaign: ${insertErr.message}` }, { status: 500 });
  }

  // Also record audit log (non-blocking)
  void (async () => {
    try {
      await admin.from("audit_logs").insert({
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: "campaign.created",
        entity_type: "campaign",
        entity_id: campaign.id,
        metadata: { name, description: body.description },
      });
    } catch { /* audit is non-critical */ }
  })();

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      tenantId: campaign.tenant_id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      config: campaign.config,
      createdAt: campaign.created_at,
    },
  }, { status: 201 });
}
