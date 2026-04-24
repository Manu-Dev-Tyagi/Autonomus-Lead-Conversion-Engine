import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { FunnelMetricsResponse, LeadState } from "@/lib/types/api";
import { createClient } from "@/utils/supabase/server";

interface LeadStateRow {
  state: LeadState;
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
    .from("leads")
    .select("state")
    .eq("tenant_id", tenantId);
  if (error) {
    return NextResponse.json({ error: `Failed to fetch analytics: ${error.message}` }, { status: 500 });
  }

  const rows = (data ?? []) as LeadStateRow[];
  const byState: Record<string, number> = {};
  for (const row of rows) {
    byState[row.state] = (byState[row.state] ?? 0) + 1;
  }

  const totalLeads = rows.length;
  const qualifiedLeads = byState.qualified ?? 0;
  const outreachSent = byState.outreach ?? 0;
  const replied = byState.replied ?? 0;
  const booked = byState.booked ?? 0;
  const converted = byState.converted ?? 0;

  const response: FunnelMetricsResponse = {
    tenantId,
    metrics: {
      totalLeads,
      qualifiedLeads,
      outreachSent,
      replied,
      booked,
      converted,
      qualificationRate: rate(qualifiedLeads, totalLeads),
      replyRate: rate(replied, outreachSent || qualifiedLeads),
      bookingRate: rate(booked, replied || outreachSent),
      conversionRate: rate(converted, totalLeads),
    },
    byState,
  };
  return NextResponse.json(response);
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}
