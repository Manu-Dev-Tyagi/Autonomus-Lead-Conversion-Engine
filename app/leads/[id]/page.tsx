"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";

import { LeadScoreIndicator } from "@/src/components/leads/LeadScoreIndicator";
import { LeadStateBadge } from "@/src/components/leads/LeadStateBadge";
import { AgentPipelineVisualizer } from "@/src/components/leads/AgentPipelineVisualizer";
import { AppShell } from "@/src/components/shared/AppShell";

// ─── Types ─────────────────────────────────────────────────────
interface LeadData {
  id: string; email: string; state: string; score: number | null;
  first_name?: string; last_name?: string; company?: string; job_title?: string;
  industry?: string; company_size?: string; location?: string;
  source?: string; linkedin_url?: string; website?: string; notes?: string;
  enrichment_data?: Record<string, unknown>;
  created_at: string; updated_at: string;
}

interface Decision {
  id: string; action: string; confidence: number | null;
  reasoning: string; metadata: Record<string, unknown>; occurred_at: string;
}

interface Enrollment {
  id: string; campaign_id: string; status: string; current_step: number;
  enrolled_at: string; campaigns?: { name: string; status: string };
}

// ─── Lead Info Widget ──────────────────────────────────────────
const LeadInfoWidget = memo(function LeadInfoWidget({ lead }: { lead: LeadData }) {
  const PIPELINE = ["new", "enriching", "enriched", "scoring", "qualified", "outreach", "replied", "booked", "converted"];
  const currentIdx = PIPELINE.indexOf(lead.state);

  return (
    <div className="ale-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <InfoCell label="STATE"><LeadStateBadge state={lead.state as any} /></InfoCell>
        <InfoCell label="SCORE"><LeadScoreIndicator score={lead.score} /></InfoCell>
        <InfoCell label="EMAIL">{lead.email}</InfoCell>
        <InfoCell label="SOURCE">{lead.source || "manual"}</InfoCell>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <InfoCell label="NAME">{[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}</InfoCell>
        <InfoCell label="COMPANY">{lead.company || "—"}</InfoCell>
        <InfoCell label="TITLE">{lead.job_title || "—"}</InfoCell>
        <InfoCell label="INDUSTRY">{lead.industry || "—"}</InfoCell>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <InfoCell label="COMPANY SIZE">{lead.company_size || "—"}</InfoCell>
        <InfoCell label="LOCATION">{lead.location || "—"}</InfoCell>
        <InfoCell label="CREATED">{new Date(lead.created_at).toLocaleString()}</InfoCell>
        <InfoCell label="UPDATED">{new Date(lead.updated_at).toLocaleString()}</InfoCell>
      </div>
      {lead.notes && (
        <div style={{ padding: 12, borderRadius: 6, background: "rgba(255,255,255,0.03)", fontSize: 13, opacity: 0.7 }}>
          📝 {lead.notes}
        </div>
      )}
      {/* Pipeline progress bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>PIPELINE PROGRESSION</div>
        <div style={{ display: "flex", gap: 2 }}>
          {PIPELINE.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 6, borderRadius: 3,
              background: i === currentIdx ? "#10b981"
                : i < currentIdx ? "rgba(16, 185, 129, 0.3)"
                : lead.state === "disqualified" && i <= 3 ? "rgba(239, 68, 68, 0.2)"
                : "rgba(255,255,255,0.08)",
            }} title={s} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, opacity: 0.3 }}>New</span>
          <span style={{ fontSize: 10, opacity: 0.3 }}>Converted</span>
        </div>
      </div>
    </div>
  );
});

// ─── Enrichment Data Widget ────────────────────────────────────
const EnrichmentWidget = memo(function EnrichmentWidget({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="ale-card"><p className="ale-muted">No enrichment data yet. Run the AI pipeline to enrich this lead.</p></div>;
  }
  return (
    <div className="ale-card">
      <h4 style={{ marginTop: 0 }}>🔍 AI Enrichment Data</h4>
      <div style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(0,0,0,0.2)", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 300 }}>
        <pre style={{ margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
});

// ─── Decisions Widget ──────────────────────────────────────────
const DecisionsWidget = memo(function DecisionsWidget({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) {
    return (
      <div className="ale-card" style={{ textAlign: "center", padding: 32 }}>
        <p style={{ fontSize: 16 }}>No AI decisions yet</p>
        <p className="ale-muted">Run the AI pipeline to generate enrichment and scoring decisions.</p>
      </div>
    );
  }
  return (
    <div className="ale-card">
      <h4 style={{ marginTop: 0 }}>🧠 AI Agent Decisions</h4>
      {decisions.map(d => (
        <div key={d.id} style={{
          padding: 14, marginBottom: 8, borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          borderLeft: `3px solid ${(d.confidence ?? 0) >= 0.8 ? "#10b981" : (d.confidence ?? 0) >= 0.6 ? "#f59e0b" : "#ef4444"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: d.action.includes("Enrich") ? "#1e3a5f" : "#3a1e5f",
              color: "white",
            }}>{d.action}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{
                fontWeight: 600, fontSize: 13,
                color: (d.confidence ?? 0) >= 0.8 ? "#10b981" : (d.confidence ?? 0) >= 0.6 ? "#f59e0b" : "#ef4444",
              }}>
                {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : "—"}
              </span>
              <span style={{ fontSize: 11, opacity: 0.4 }}>{new Date(d.occurred_at).toLocaleString()}</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{d.reasoning}</p>
        </div>
      ))}
    </div>
  );
});

// ─── Enrollments Widget ────────────────────────────────────────
const EnrollmentsWidget = memo(function EnrollmentsWidget({ leadId }: { leadId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);

  if (!mounted.current) {
    mounted.current = true;
    void (async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/enroll`);
        const data = await res.json();
        setEnrollments(data.enrollments || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }

  if (loading) return <div className="ale-card"><p className="ale-muted">Loading enrollments...</p></div>;
  if (enrollments.length === 0) {
    return <div className="ale-card"><p className="ale-muted">Not enrolled in any campaigns.</p></div>;
  }

  return (
    <div className="ale-card">
      <h4 style={{ marginTop: 0 }}>🚀 Campaign Enrollments</h4>
      {enrollments.map(e => (
        <div key={e.id} style={{
          padding: 10, marginBottom: 6, borderRadius: 6,
          background: "rgba(99, 102, 241, 0.05)",
          border: "1px solid rgba(99, 102, 241, 0.15)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <span style={{ fontWeight: 500 }}>{(e.campaigns as any)?.name || e.campaign_id}</span>
            <span style={{
              marginLeft: 8, fontSize: 11, padding: "2px 6px", borderRadius: 3,
              background: e.status === "active" ? "#10b981" : "#555", color: "white",
            }}>{e.status}</span>
          </div>
          <span style={{ fontSize: 12, opacity: 0.5 }}>Step {e.current_step} · {new Date(e.enrolled_at).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
});

// ─── Main Page ─────────────────────────────────────────────────
export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const [lead, setLead] = useState<LeadData | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string>("pipeline");
  const mounted = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      setLead(data.lead || null);
      setDecisions(data.decisions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
    setLoading(false);
  }, [leadId]);

  if (!mounted.current) {
    mounted.current = true;
    void fetchAll();
  }

  const title = lead?.email ?? "Lead Detail";

  return (
    <AppShell title={title} subtitle="View lead data, AI decisions, and agent processing." actions={<Link href="/leads">← Back to leads</Link>}>
      {loading && <p>Loading lead...</p>}
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      {!loading && lead && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          {/* Main Content */}
          <div>
            <LeadInfoWidget lead={lead} />

            {/* Agent Pipeline Visualizer — the star of the show */}
            {(lead.state === "new" || activePanel === "pipeline") && (
              <div className="ale-card" style={{ marginBottom: 16 }}>
                <AgentPipelineVisualizer
                  leadId={lead.id}
                  leadEmail={lead.email}
                  leadState={lead.state}
                  onComplete={() => void fetchAll()}
                />
              </div>
            )}

            {/* Decisions */}
            {activePanel === "decisions" && <DecisionsWidget decisions={decisions} />}
            {activePanel === "enrichment" && <EnrichmentWidget data={lead.enrichment_data || {}} />}
            {activePanel === "campaigns" && <EnrollmentsWidget leadId={lead.id} />}
          </div>

          {/* Side Panel */}
          <div>
            <SideNav active={activePanel} onChange={setActivePanel} lead={lead} decisionCount={decisions.length} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ─── Side Navigation ───────────────────────────────────────────
const SideNav = memo(function SideNav({ active, onChange, lead, decisionCount }: {
  active: string; onChange: (v: string) => void; lead: LeadData; decisionCount: number;
}) {
  const items = [
    { id: "pipeline", icon: "🤖", label: "AI Pipeline", desc: "Watch agents process this lead" },
    { id: "decisions", icon: "🧠", label: "Agent Decisions", desc: `${decisionCount} decision(s) recorded`, badge: decisionCount },
    { id: "enrichment", icon: "🔍", label: "Enrichment Data", desc: "AI-discovered company intel" },
    { id: "campaigns", icon: "🚀", label: "Campaigns", desc: "Campaign enrollments" },
  ];

  return (
    <div className="ale-card" style={{ position: "sticky", top: 16 }}>
      <h4 style={{ marginTop: 0, fontSize: 13, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>Views</h4>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          style={{
            display: "block", width: "100%", textAlign: "left",
            padding: "10px 12px", marginBottom: 4, borderRadius: 8,
            border: "none", cursor: "pointer",
            background: active === item.id ? "rgba(99, 102, 241, 0.15)" : "transparent",
            color: "inherit",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{item.icon}</span>
            <span style={{ fontWeight: active === item.id ? 600 : 400, fontSize: 14 }}>{item.label}</span>
            {item.badge ? (
              <span style={{ marginLeft: "auto", fontSize: 11, background: "#6366f1", color: "white", padding: "1px 6px", borderRadius: 8 }}>
                {item.badge}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginLeft: 28 }}>{item.desc}</div>
        </button>
      ))}

      {/* Quick stats */}
      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
        <h4 style={{ marginTop: 0, fontSize: 12, opacity: 0.5 }}>QUICK STATS</h4>
        <div style={{ fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ opacity: 0.6 }}>Score</span>
            <span style={{ fontWeight: 600, color: (lead.score ?? 0) >= 70 ? "#10b981" : "#ef4444" }}>
              {lead.score ?? "—"}/100
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ opacity: 0.6 }}>State</span>
            <LeadStateBadge state={lead.state as any} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ opacity: 0.6 }}>Industry</span>
            <span>{lead.industry || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ opacity: 0.6 }}>AI Decisions</span>
            <span>{decisionCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Helper ────────────────────────────────────────────────────
function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}
