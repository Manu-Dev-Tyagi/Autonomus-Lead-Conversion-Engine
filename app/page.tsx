import { cookies } from "next/headers";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { AppShell } from "@/src/components/shared/AppShell";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="ale-container">
        <h1>Welcome to ALE</h1>
        <p className="ale-muted">Sign in to access your tenant workspace.</p>
        <Link href="/auth/sign-in">Go to sign in</Link>
      </div>
    );
  }

  const tenantId = (user.app_metadata?.tenant_id as string) ?? "";
  const role = (user.app_metadata?.role as string) ?? "";
  const isAdmin = role === "admin" || role === "owner";

  // Fetch real metrics using admin client (bypasses RLS for aggregation)
  const admin = getAdminClient();
  
  // Leads by state
  const { data: leads } = await admin
    .from("leads")
    .select("id, state, score")
    .eq("tenant_id", tenantId);
  
  const allLeads = leads ?? [];
  const totalLeads = allLeads.length;
  const byState: Record<string, number> = {};
  for (const l of allLeads) {
    byState[l.state] = (byState[l.state] || 0) + 1;
  }

  // Recent AI decisions
  const { data: recentDecisions } = await admin
    .from("agent_decisions")
    .select("id, action, confidence, reasoning, lead_id, occurred_at")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false })
    .limit(5);

  // Active campaigns
  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .limit(10);

  // Pending approvals (low confidence decisions)
  const lowConfidenceCount = (recentDecisions ?? []).filter(
    (d: any) => d.confidence !== null && d.confidence < 0.7
  ).length;

  const qualificationRate = totalLeads > 0
    ? Math.round(((byState["qualified"] || 0) / totalLeads) * 100)
    : 0;

  return (
    <AppShell
      title="Revenue Command Center"
      subtitle={`Signed in as ${user.email ?? "user"}`}
      showAdminLinks={isAdmin}
      actions={
        <form action={signOut}>
          <button className="ale-button" type="submit">Sign out</button>
        </form>
      }
    >
      {/* KPI Summary Row */}
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Total Leads" value={totalLeads} />
        <KpiCard label="Qualified" value={byState["qualified"] || 0} hint={`${qualificationRate}% rate`} />
        <KpiCard label="In Outreach" value={byState["outreach"] || 0} />
        <KpiCard label="Meetings Booked" value={byState["booked"] || 0} />
      </section>

      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="New (Unprocessed)" value={byState["new"] || 0} hint="Waiting for AI processing" />
        <KpiCard label="Disqualified" value={byState["disqualified"] || 0} />
        <KpiCard label="Converted" value={byState["converted"] || 0} />
        <KpiCard
          label="Needs Review"
          value={lowConfidenceCount}
          hint="Low-confidence AI decisions"
        />
      </section>

      {/* Pipeline Funnel */}
      <section className="ale-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Lead Pipeline Funnel</h2>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120, padding: "8px 0" }}>
          {["new", "enriching", "enriched", "scoring", "qualified", "outreach", "replied", "booked", "converted"].map((state) => {
            const count = byState[state] || 0;
            const height = totalLeads > 0 ? Math.max(8, (count / totalLeads) * 100) : 8;
            return (
              <div key={state} style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: `${height}%`,
                    minHeight: 4,
                    background: state === "qualified" ? "#10b981" : state === "converted" ? "#6366f1" : "#3b82f6",
                    borderRadius: 4,
                    marginBottom: 4,
                    transition: "height 0.3s ease",
                  }}
                />
                <div style={{ fontSize: 10, opacity: 0.6 }}>{state}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent AI Decisions */}
      <section className="ale-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Recent AI Decisions</h2>
        {(recentDecisions ?? []).length === 0 ? (
          <p className="ale-muted">No AI decisions yet. Add a lead to trigger the pipeline.</p>
        ) : (
          <table className="ale-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Confidence</th>
                <th>Reasoning</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(recentDecisions ?? []).map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: d.action.includes("Enrich") ? "#1e3a5f" : "#3a1e5f",
                      color: "white",
                    }}>
                      {d.action}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      color: d.confidence >= 0.8 ? "#10b981" : d.confidence >= 0.6 ? "#f59e0b" : "#ef4444",
                      fontWeight: 600,
                    }}>
                      {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : "—"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.reasoning}
                  </td>
                  <td style={{ fontSize: 12, opacity: 0.6 }}>
                    {new Date(d.occurred_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Quick Actions */}
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <div className="ale-card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>
              <Link href="/leads" style={{ display: "block", padding: "8px 12px", borderRadius: 6, background: "rgba(59, 130, 246, 0.1)", textDecoration: "none" }}>
                📊 Lead Management — Add, process, and manage leads
              </Link>
            </li>
            <li style={{ marginBottom: 8 }}>
              <Link href="/campaigns" style={{ display: "block", padding: "8px 12px", borderRadius: 6, background: "rgba(16, 185, 129, 0.1)", textDecoration: "none" }}>
                🚀 Campaigns — Create outreach sequences
              </Link>
            </li>
            <li style={{ marginBottom: 8 }}>
              <Link href="/approvals" style={{ display: "block", padding: "8px 12px", borderRadius: 6, background: "rgba(245, 158, 11, 0.1)", textDecoration: "none" }}>
                ✅ Approvals — Review low-confidence AI decisions
              </Link>
            </li>
            <li style={{ marginBottom: 8 }}>
              <Link href="/analytics" style={{ display: "block", padding: "8px 12px", borderRadius: 6, background: "rgba(99, 102, 241, 0.1)", textDecoration: "none" }}>
                📈 Analytics — Funnel metrics and conversion tracking
              </Link>
            </li>
            <li>
              <Link href="/settings" style={{ display: "block", padding: "8px 12px", borderRadius: 6, background: "rgba(255, 255, 255, 0.05)", textDecoration: "none" }}>
                ⚙️ Settings — Webhooks, API keys, integrations
              </Link>
            </li>
          </ul>
        </div>

        <div className="ale-card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Active Campaigns</h3>
          {(campaigns ?? []).length === 0 ? (
            <p className="ale-muted">No campaigns yet. <Link href="/campaigns">Create one</Link>.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {(campaigns ?? []).map((c: any) => (
                <li key={c.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    fontSize: 11,
                    borderRadius: 3,
                    background: c.status === "active" ? "#10b981" : "#666",
                    color: "white",
                  }}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
