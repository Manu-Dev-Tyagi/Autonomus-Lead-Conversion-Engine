import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { LeadDetailResponse, LeadState } from "@/lib/types/api";
import { createClient } from "@/utils/supabase/server";

const LEAD_STATES: ReadonlySet<LeadState> = new Set([
  "new",
  "enriching",
  "enriched",
  "scoring",
  "qualified",
  "disqualified",
  "outreach",
  "replied",
  "booked",
  "converted",
  "lost",
]);

interface LeadRow {
  id: string;
  tenant_id: string;
  email: string;
  state: LeadState;
  score: number | null;
  created_at: string;
  updated_at: string;
}

interface InteractionRow {
  id: string;
  type: string;
  outcome: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface AgentDecisionRow {
  id: string;
  action: string;
  confidence: number | null;
  reasoning: string;
  occurred_at: string;
}

export async function GET(
  _request: NextRequest,
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

  const { data: leadData, error: leadError } = await supabase
    .from("leads")
    .select("id, tenant_id, email, state, score, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (leadError) {
    return NextResponse.json({ error: `Failed to fetch lead: ${leadError.message}` }, { status: 500 });
  }
  if (!leadData) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const [interactionsRes, decisionsRes] = await Promise.all([
    supabase
      .from("interactions")
      .select("id, type, outcome, payload, created_at")
      .eq("tenant_id", tenantId)
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("agent_decisions")
      .select("id, action, confidence, reasoning, occurred_at")
      .eq("tenant_id", tenantId)
      .eq("lead_id", id)
      .order("occurred_at", { ascending: false })
      .limit(25),
  ]);

  if (interactionsRes.error) {
    return NextResponse.json(
      { error: `Failed to fetch interactions: ${interactionsRes.error.message}` },
      { status: 500 },
    );
  }
  if (decisionsRes.error) {
    return NextResponse.json(
      { error: `Failed to fetch decisions: ${decisionsRes.error.message}` },
      { status: 500 },
    );
  }

  const lead = leadData as LeadRow;
  const interactions = (interactionsRes.data ?? []) as InteractionRow[];
  const decisions = (decisionsRes.data ?? []) as AgentDecisionRow[];

  const response: LeadDetailResponse = {
    lead: {
      id: lead.id,
      tenantId: lead.tenant_id,
      email: lead.email,
      state: lead.state,
      score: lead.score,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
    },
    interactions: interactions.map((row) => ({
      id: row.id,
      type: row.type,
      outcome: row.outcome,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    })),
    decisions: decisions.map((row) => ({
      id: row.id,
      action: row.action,
      confidence: row.confidence,
      reasoning: row.reasoning,
      occurredAt: row.occurred_at,
    })),
  };
  return NextResponse.json(response);
}

export async function PATCH(
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

  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    state?: unknown;
    score?: unknown;
  };

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.email === "string" && body.email.trim()) {
    const normalizedEmail = body.email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    payload.email = normalizedEmail;
  }
  if (typeof body.state === "string") {
    if (!LEAD_STATES.has(body.state as LeadState)) {
      return NextResponse.json({ error: "Invalid lead state." }, { status: 400 });
    }
    payload.state = body.state;
  }
  if (body.score === null) {
    payload.score = null;
  } else if (typeof body.score === "number") {
    if (!Number.isFinite(body.score) || body.score < 0 || body.score > 100) {
      return NextResponse.json({ error: "Score must be between 0 and 100." }, { status: 400 });
    }
    payload.score = body.score;
  }

  if (Object.keys(payload).length === 1) {
    return NextResponse.json(
      { error: "No updatable fields provided. Use email, state, or score." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("id, tenant_id, email, state, score, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: `Failed to update lead: ${error.message}` }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const row = data as LeadRow;
  return NextResponse.json({
    lead: {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      state: row.state,
      score: row.score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
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

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: `Failed to delete lead: ${error.message}` }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
