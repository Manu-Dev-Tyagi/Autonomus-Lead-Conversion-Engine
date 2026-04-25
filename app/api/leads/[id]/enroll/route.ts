import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/leads/[id]/enroll
 * Enroll a lead into one or more campaigns.
 * Body: { campaignIds: string[] }
 * 
 * A lead can be in multiple campaigns, but only once per campaign (UNIQUE constraint).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { campaignIds?: string[] };
  const campaignIds = Array.isArray(body.campaignIds) ? body.campaignIds : [];
  if (campaignIds.length === 0) {
    return NextResponse.json({ error: "No campaigns specified." }, { status: 400 });
  }

  const admin = getAdminClient();

  // Verify lead exists
  const { data: lead } = await admin.from("leads").select("id, email").eq("id", leadId).eq("tenant_id", tenantId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  // Enroll in each campaign (skip duplicates via ON CONFLICT)
  const enrollments = campaignIds.map(campaignId => ({
    tenant_id: tenantId,
    lead_id: leadId,
    campaign_id: campaignId,
    status: "active",
    current_step: 0,
    enrolled_at: new Date().toISOString(),
  }));

  const { data: enrolled, error: enrollErr } = await admin
    .from("sequence_enrollments")
    .upsert(enrollments, { onConflict: "lead_id,campaign_id", ignoreDuplicates: true })
    .select("id, campaign_id, status");

  if (enrollErr) {
    return NextResponse.json({ error: `Enrollment failed: ${enrollErr.message}` }, { status: 500 });
  }

  // Update campaign enrolled counts
  for (const cid of campaignIds) {
    const { count } = await admin
      .from("sequence_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", cid);
    await admin.from("campaigns").update({ enrolled_count: count || 0 }).eq("id", cid);
  }

  return NextResponse.json({
    success: true,
    enrollments: enrolled,
    message: `Lead enrolled in ${enrolled?.length || 0} campaign(s)`,
  });
}

/**
 * GET /api/leads/[id]/enroll
 * Get all campaign enrollments for a lead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("sequence_enrollments")
    .select("id, campaign_id, status, current_step, enrolled_at, campaigns(name, status)")
    .eq("lead_id", leadId)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enrollments: data || [] });
}
