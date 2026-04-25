import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/leads/[id]/process
 * 
 * Triggers the autonomous AI pipeline for a lead:
 *   new → enriching → enriched → scoring → qualified/disqualified
 * 
 * This is the CORE of the product — it's what makes ALE autonomous.
 * Each step calls the AI agent gateway (Gemini or Mock) and records
 * decisions, then updates the lead state in the database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });
  }

  // Use admin client for processing (bypasses RLS for state updates)
  const admin = getAdminClient();

  // 1. Fetch the lead
  const { data: lead, error: fetchErr } = await admin
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  // Only process leads in "new" state
  if (lead.state !== "new") {
    return NextResponse.json({
      error: `Lead is already in "${lead.state}" state. Only "new" leads can be processed.`,
      lead
    }, { status: 409 });
  }

  try {
    // ============ STAGE 1: ENRICHMENT ============
    await admin.from("leads").update({ state: "enriching", updated_at: new Date().toISOString() }).eq("id", leadId);

    // Call the AI agent for enrichment
    const { registerCoreAdapters } = await import("@/src/core/infrastructure/ioc/registerCoreAdapters");
    const { appContainer } = await import("@/src/core/infrastructure/ioc/container");
    const { IoCTokens } = await import("@/src/core/infrastructure/ioc/tokens");
    const { AgentAction } = await import("@/src/core/domain/agent/AgentAction");

    // Ensure adapters are registered
    if (!appContainer.has(IoCTokens.AgentGateway)) {
      registerCoreAdapters(appContainer);
    }

    const agentGateway = appContainer.resolve(IoCTokens.AgentGateway);

    const enrichmentDecision = await (agentGateway as any).execute(
      AgentAction.EnrichLead,
      {
        tenantId,
        leadId,
        email: lead.email,
        lead: {
          email: lead.email,
          firstName: lead.first_name,
          lastName: lead.last_name,
          company: lead.company,
          jobTitle: lead.job_title,
          industry: lead.industry,
          companySize: lead.company_size,
          location: lead.location,
          linkedinUrl: lead.linkedin_url,
          website: lead.website,
        },
        company: { name: lead.company, industry: lead.industry, size: lead.company_size },
        scraping: {},
      }
    );

    // Record the enrichment decision
    await admin.from("agent_decisions").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      action: AgentAction.EnrichLead,
      confidence: enrichmentDecision.confidence,
      reasoning: enrichmentDecision.reasoning,
      alternatives: enrichmentDecision.alternatives || [],
      metadata: enrichmentDecision.metadata || {},
      occurred_at: new Date().toISOString(),
    });

    // Write AI-enriched data back to the lead
    const enrichedFields: Record<string, unknown> = {
      state: "enriched",
      updated_at: new Date().toISOString(),
      enrichment_data: enrichmentDecision.metadata || {},
    };
    // Fill in any fields the AI discovered that were missing
    const em = enrichmentDecision.metadata?.enrichedFields || enrichmentDecision.metadata || {};
    if (!lead.industry && em.industry) enrichedFields.industry = em.industry;
    if (!lead.company_size && em.size) enrichedFields.company_size = em.size;
    if (!lead.company && em.company) enrichedFields.company = em.company;
    await admin.from("leads").update(enrichedFields).eq("id", leadId);

    // ============ STAGE 2: SCORING ============
    await admin.from("leads").update({ state: "scoring", updated_at: new Date().toISOString() }).eq("id", leadId);

    const scoringDecision = await (agentGateway as any).execute(
      AgentAction.ScoreLead,
      {
        tenantId,
        leadId,
        email: lead.email,
        enrichment: enrichmentDecision.metadata,
      }
    );

    // Record the scoring decision
    await admin.from("agent_decisions").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      action: AgentAction.ScoreLead,
      confidence: scoringDecision.confidence,
      reasoning: scoringDecision.reasoning,
      alternatives: scoringDecision.alternatives || [],
      metadata: scoringDecision.metadata || {},
      occurred_at: new Date().toISOString(),
    });

    // Calculate score (use confidence * 100 or metadata.score if available)
    const score = Math.round(
      (scoringDecision.metadata?.score ?? scoringDecision.confidence * 100)
    );
    const QUALIFICATION_THRESHOLD = 70;
    const finalState = score >= QUALIFICATION_THRESHOLD ? "qualified" : "disqualified";

    // Update lead with final state and score
    await admin.from("leads").update({
      state: finalState,
      score,
      updated_at: new Date().toISOString(),
    }).eq("id", leadId);

    // Update pipeline read model
    await admin.from("pipeline_read_models").upsert({
      tenant_id: tenantId,
      lead_id: leadId,
      state: finalState,
      score,
      updated_at: new Date().toISOString(),
    });

    // Record audit log
    await admin.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: user.id,
      action: "lead.processed",
      entity_type: "lead",
      entity_id: leadId,
      metadata: {
        finalState,
        score,
        enrichmentConfidence: enrichmentDecision.confidence,
        scoringConfidence: scoringDecision.confidence,
      },
    });

    // Fetch the updated lead
    const { data: updatedLead } = await admin.from("leads").select("*").eq("id", leadId).single();

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      pipeline: {
        enrichment: {
          confidence: enrichmentDecision.confidence,
          reasoning: enrichmentDecision.reasoning,
          metadata: enrichmentDecision.metadata,
        },
        scoring: {
          confidence: scoringDecision.confidence,
          reasoning: scoringDecision.reasoning,
          score,
          qualified: finalState === "qualified",
        },
      },
    });
  } catch (err) {
    console.error("[ProcessLead] Pipeline error:", err);
    
    // Mark lead as failed (back to new so it can be retried)
    await admin.from("leads").update({ state: "new", updated_at: new Date().toISOString() }).eq("id", leadId);

    return NextResponse.json({
      error: `Pipeline processing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 500 });
  }
}
