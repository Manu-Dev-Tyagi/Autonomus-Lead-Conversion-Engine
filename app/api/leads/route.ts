import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { CreateLeadResponse, LeadState, ListLeadsResponse } from "@/lib/types/api";
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

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const page = clampNumber(searchParams.get("page"), 1, 10_000);
  const pageSize = clampNumber(searchParams.get("pageSize"), 20, 100);
  const rawState = searchParams.get("state");
  const search = (searchParams.get("search") ?? "").trim();
  const state = rawState && LEAD_STATES.has(rawState as LeadState) ? (rawState as LeadState) : null;

  let query = supabase
    .from("leads")
    .select("id, tenant_id, email, state, score, created_at, updated_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (state) {
    query = query.eq("state", state);
  }
  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: `Failed to fetch leads: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as LeadRow[];
  const response: ListLeadsResponse = {
    data: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      state: row.state,
      score: row.score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };

  return NextResponse.json(response);
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

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: tenantId,
      email,
      state: "new",
    })
    .select("id, tenant_id, email, state, score, created_at, updated_at")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: `Failed to create lead: ${error.message}` }, { status });
  }

  const row = data as LeadRow;
  const response: CreateLeadResponse = {
    lead: {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      state: row.state,
      score: row.score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
  return NextResponse.json(response, { status: 201 });
}

function clampNumber(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
