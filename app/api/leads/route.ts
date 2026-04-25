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
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (state) {
    query = query.eq("state", state);
  }
  if (search) {
    // Search across email, name, and company
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: `Failed to fetch leads: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as any[];
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      company: row.company,
      jobTitle: row.job_title,
      industry: row.industry,
      companySize: row.company_size,
      location: row.location,
      source: row.source,
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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // Build insert row with all available fields
  const insertRow: Record<string, unknown> = {
    tenant_id: tenantId,
    email,
    state: "new",
  };
  
  // Optional rich fields
  if (typeof body.firstName === "string" && body.firstName.trim()) insertRow.first_name = body.firstName.trim();
  if (typeof body.lastName === "string" && body.lastName.trim()) insertRow.last_name = body.lastName.trim();
  if (typeof body.company === "string" && body.company.trim()) insertRow.company = body.company.trim();
  if (typeof body.jobTitle === "string" && body.jobTitle.trim()) insertRow.job_title = body.jobTitle.trim();
  if (typeof body.phone === "string" && body.phone.trim()) insertRow.phone = body.phone.trim();
  if (typeof body.linkedinUrl === "string" && body.linkedinUrl.trim()) insertRow.linkedin_url = body.linkedinUrl.trim();
  if (typeof body.website === "string" && body.website.trim()) insertRow.website = body.website.trim();
  if (typeof body.source === "string" && body.source.trim()) insertRow.source = body.source.trim();
  if (typeof body.industry === "string" && body.industry.trim()) insertRow.industry = body.industry.trim();
  if (typeof body.companySize === "string" && body.companySize.trim()) insertRow.company_size = body.companySize.trim();
  if (typeof body.location === "string" && body.location.trim()) insertRow.location = body.location.trim();
  if (typeof body.notes === "string" && body.notes.trim()) insertRow.notes = body.notes.trim();

  const { data, error } = await supabase
    .from("leads")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: `Failed to create lead: ${error.message}` }, { status });
  }

  // AUTO-TRIGGER: Fire the AI processing pipeline in the background
  const origin = request.headers.get("origin") || request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;
  
  fetch(`${baseUrl}/api/leads/${data.id}/process`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  }).catch((err) => {
    console.error(`[AutoProcess] Failed to trigger pipeline for lead ${data.id}:`, err);
  });

  return NextResponse.json({
    lead: {
      id: data.id,
      tenantId: data.tenant_id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      company: data.company,
      jobTitle: data.job_title,
      state: data.state,
      score: data.score,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    processing: true,
  }, { status: 201 });
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
