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

/**
 * POST /api/webhooks/forms
 * 
 * Public webhook endpoint for lead ingestion from external forms.
 * When a lead is ingested, it automatically triggers the AI processing pipeline.
 * 
 * Usage: POST with { tenantId, email } to ingest a lead.
 * The tenant ID can be found in Settings → Webhook Configuration.
 */
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

  // Insert the lead
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

  const leadId = data.id;

  // AUTO-TRIGGER: Run the AI processing pipeline
  // We do this inline since webhooks are server-to-server
  try {
    const { registerCoreAdapters } = await import("@/src/core/infrastructure/ioc/registerCoreAdapters");
    const { appContainer } = await import("@/src/core/infrastructure/ioc/container");
    const { IoCTokens } = await import("@/src/core/infrastructure/ioc/tokens");
    const { AgentAction } = await import("@/src/core/domain/agent/AgentAction");

    if (!appContainer.has(IoCTokens.AgentGateway)) {
      registerCoreAdapters(appContainer);
    }

    const agentGateway = appContainer.resolve(IoCTokens.AgentGateway);

    // Stage 1: Enrichment
    await supabase.from("leads").update({ state: "enriching" }).eq("id", leadId);
    const enrichment = await (agentGateway as any).execute(AgentAction.EnrichLead, {
      tenantId, leadId, email, lead: { email }, company: {}, scraping: {},
    });
    await supabase.from("agent_decisions").insert({
      tenant_id: tenantId, lead_id: leadId, action: AgentAction.EnrichLead,
      confidence: enrichment.confidence, reasoning: enrichment.reasoning,
      alternatives: enrichment.alternatives || [], metadata: enrichment.metadata || {},
    });
    await supabase.from("leads").update({ state: "enriched" }).eq("id", leadId);

    // Stage 2: Scoring
    await supabase.from("leads").update({ state: "scoring" }).eq("id", leadId);
    const scoring = await (agentGateway as any).execute(AgentAction.ScoreLead, {
      tenantId, leadId, email, enrichment: enrichment.metadata,
    });
    await supabase.from("agent_decisions").insert({
      tenant_id: tenantId, lead_id: leadId, action: AgentAction.ScoreLead,
      confidence: scoring.confidence, reasoning: scoring.reasoning,
      alternatives: scoring.alternatives || [], metadata: scoring.metadata || {},
    });

    const score = Math.round(scoring.metadata?.score ?? scoring.confidence * 100);
    const finalState = score >= 70 ? "qualified" : "disqualified";
    await supabase.from("leads").update({ state: finalState, score }).eq("id", leadId);

    // Update pipeline read model
    await supabase.from("pipeline_read_models").upsert({
      tenant_id: tenantId, lead_id: leadId, state: finalState, score,
    });

    return NextResponse.json({
      success: true,
      leadId,
      state: finalState,
      score,
      processing: "completed",
    }, { status: 201 });
  } catch (pipelineErr) {
    console.error("[Webhook] Pipeline processing failed:", pipelineErr);
    // Lead was created but processing failed — it stays in "new" or intermediate state
    return NextResponse.json({
      success: true,
      leadId,
      processing: "failed",
      error: pipelineErr instanceof Error ? pipelineErr.message : "Processing failed",
    }, { status: 201 });
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
