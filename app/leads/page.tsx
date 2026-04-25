"use client";

import Link from "next/link";
import { memo, useCallback, useRef, useState } from "react";

import { LeadScoreIndicator } from "@/src/components/leads/LeadScoreIndicator";
import { LeadStateBadge } from "@/src/components/leads/LeadStateBadge";
import { CampaignSelector } from "@/src/components/leads/CampaignSelector";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { Toast } from "@/src/components/shared/Toast";

// ─── Constants ────────────────────────────────────────────────
const FILTER_STATES = ["all", "new", "qualified", "disqualified", "outreach", "replied", "booked", "converted", "lost"] as const;
const SOURCE_OPTIONS = ["manual", "form", "webhook", "import", "linkedin", "referral"];
const INDUSTRY_OPTIONS = ["Technology", "SaaS", "FinTech", "Healthcare", "E-commerce", "Education", "Manufacturing", "Consulting", "Real Estate", "Other"];
const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

// ─── KPI Widget ───────────────────────────────────────────────
const KpiBar = memo(function KpiBar({ leads }: { leads: any[] }) {
  const qual = leads.filter(l => l.state === "qualified").length;
  const proc = leads.filter(l => ["enriching", "scoring"].includes(l.state)).length;
  const newc = leads.filter(l => l.state === "new").length;
  return (
    <section className="ale-row" style={{ marginBottom: 16 }}>
      <KpiCard label="Total Leads" value={leads.length} />
      <KpiCard label="Qualified" value={qual} />
      <KpiCard label="Processing" value={proc} hint="AI pipeline running" />
      <KpiCard label="New" value={newc} />
    </section>
  );
});

// ─── Lead Form Widget ─────────────────────────────────────────
const EMPTY_FORM = {
  email: "", firstName: "", lastName: "", company: "", jobTitle: "",
  phone: "", linkedinUrl: "", website: "", source: "manual",
  industry: "", companySize: "", location: "", notes: "",
};

const LeadFormWidget = memo(function LeadFormWidget({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const f = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Enroll in campaigns if any selected
      if (campaignIds.length > 0 && data.lead?.id) {
        await fetch(`/api/leads/${data.lead.id}/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignIds }),
        });
      }

      setForm(EMPTY_FORM);
      setCampaignIds([]);
      setSuccess(`Lead created! AI pipeline processing ${form.email}...`);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }, [form, campaignIds, onCreated]);

  return (
    <section className="ale-card" style={{ marginBottom: 16, borderLeft: "3px solid #10b981" }}>
      <h3 style={{ marginTop: 0 }}>➕ Add New Lead</h3>
      {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
      {success && <p style={{ color: "#10b981", fontSize: 13 }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        {/* Contact Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Email *" required type="email" value={form.email} onChange={v => f("email", v)} placeholder="lead@company.com" />
          <Field label="First Name" value={form.firstName} onChange={v => f("firstName", v)} placeholder="John" />
          <Field label="Last Name" value={form.lastName} onChange={v => f("lastName", v)} placeholder="Doe" />
        </div>
        {/* Company Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Company" value={form.company} onChange={v => f("company", v)} placeholder="Acme Inc" />
          <Field label="Job Title" value={form.jobTitle} onChange={v => f("jobTitle", v)} placeholder="VP of Engineering" />
          <SelectField label="Industry" value={form.industry} onChange={v => f("industry", v)} options={INDUSTRY_OPTIONS} />
        </div>
        {/* Extra */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <SelectField label="Company Size" value={form.companySize} onChange={v => f("companySize", v)} options={COMPANY_SIZE_OPTIONS} />
          <Field label="Location" value={form.location} onChange={v => f("location", v)} placeholder="San Francisco" />
          <SelectField label="Source" value={form.source} onChange={v => f("source", v)} options={SOURCE_OPTIONS} noEmpty />
          <Field label="LinkedIn" value={form.linkedinUrl} onChange={v => f("linkedinUrl", v)} placeholder="linkedin.com/in/..." />
        </div>
        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <label>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Notes</span>
            <textarea className="ale-input" value={form.notes} onChange={e => f("notes", e.target.value)}
              placeholder="Context: met at conference, interested in AI automation..."
              rows={2} style={{ width: "100%", resize: "vertical" }} />
          </label>
        </div>
        {/* Campaign enrollment */}
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
          <CampaignSelector selected={campaignIds} onChange={setCampaignIds} />
        </div>
        {/* Submit */}
        <div className="ale-row" style={{ gap: 8 }}>
          <button className="ale-button" type="submit" disabled={creating}
            style={{ background: "#10b981", fontWeight: 600, padding: "10px 20px" }}>
            {creating ? "⚡ Processing..." : "⚡ Add & Auto-Process"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.5 }}>
            AI will enrich → score → qualify automatically
            {campaignIds.length > 0 && ` · Enrolling in ${campaignIds.length} campaign(s)`}
          </span>
        </div>
      </form>
    </section>
  );
});

// ─── Lead Table Widget ────────────────────────────────────────
const LeadTableWidget = memo(function LeadTableWidget({ leads, page, totalPages, onPageChange }: {
  leads: any[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (leads.length === 0) {
    return (
      <section className="ale-card" style={{ textAlign: "center", padding: 40 }}>
        <h3>No leads match your filters</h3>
        <p className="ale-muted">Add a lead above or adjust your filters.</p>
      </section>
    );
  }

  return (
    <>
      <table className="ale-table">
        <thead>
          <tr>
            <th align="left">Contact</th>
            <th align="left">Company</th>
            <th align="left">State</th>
            <th align="left">Score</th>
            <th align="left">Source</th>
            <th align="left">Created</th>
            <th align="left"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead: any) => (
            <tr key={lead.id}>
              <td>
                <div style={{ fontWeight: 500 }}>{lead.email}</div>
                {(lead.firstName || lead.lastName) && (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {[lead.firstName, lead.lastName].filter(Boolean).join(" ")}
                    {lead.jobTitle && ` · ${lead.jobTitle}`}
                  </div>
                )}
              </td>
              <td>
                {lead.company || <span style={{ opacity: 0.3 }}>—</span>}
                {lead.industry && <div style={{ fontSize: 11, opacity: 0.5 }}>{lead.industry}</div>}
              </td>
              <td><LeadStateBadge state={lead.state} /></td>
              <td><LeadScoreIndicator score={lead.score} /></td>
              <td style={{ fontSize: 12, opacity: 0.6 }}>{lead.source || "manual"}</td>
              <td style={{ fontSize: 12 }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td>
                <Link href={`/leads/${lead.id}`} style={{ fontSize: 13, fontWeight: 500 }}>
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="ale-row" style={{ justifyContent: "center", marginTop: 12, gap: 8 }}>
          <button className="ale-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
          <span className="ale-muted">Page {page} / {totalPages}</span>
          <button className="ale-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
});

// ─── Reusable form fields (no re-renders for parent) ──────────
function Field({ label, value, onChange, placeholder, type, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label>
      <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>
      <input className="ale-input" type={type || "text"} required={required}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{ width: "100%" }} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, noEmpty }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; noEmpty?: boolean;
}) {
  return (
    <label>
      <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>
      <select className="ale-select" value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%" }}>
        {!noEmpty && <option value="">— Select —</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const didMount = useRef(false);
  const pageSize = 10;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "100");
      if (stateFilter !== "all") params.set("state", stateFilter);
      if (search.trim()) params.set("search", search);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [stateFilter, search]);

  // Initial fetch
  if (!didMount.current) {
    didMount.current = true;
    void fetchLeads();
  }

  // Sort leads
  const sorted = [...leads].sort((a, b) => {
    if (sortBy === "score") return ((b.score ?? -1) - (a.score ?? -1));
    if (sortBy === "email") return a.email.localeCompare(b.email);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppShell title="Lead Management" subtitle="Ingest leads, run AI pipeline, and manage qualification.">
      <KpiBar leads={leads} />

      {/* Toolbar */}
      <section className="ale-row" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <label>
          State{" "}
          <select className="ale-select" value={stateFilter} onChange={e => { setStateFilter(e.target.value); void fetchLeads(); }}>
            {FILTER_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Search{" "}
          <input className="ale-input" value={search} placeholder="email, name, company..."
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void fetchLeads(); }} />
        </label>
        <label>
          Sort{" "}
          <select className="ale-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="createdAt">Date</option>
            <option value="score">Score</option>
            <option value="email">Email</option>
          </select>
        </label>
        <button className="ale-button" style={{ fontSize: 12 }} onClick={() => void fetchLeads()}>🔄 Refresh</button>
        <button className="ale-button" style={{ marginLeft: "auto", background: "#10b981", fontWeight: 600 }}
          onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Close" : "＋ Add Lead"}
        </button>
      </section>

      {/* Form */}
      {showForm && (
        <LeadFormWidget onCreated={() => {
          setToast({ tone: "success", message: "Lead created! AI pipeline running..." });
          setTimeout(() => void fetchLeads(), 500);
          setTimeout(() => void fetchLeads(), 4000);
          setTimeout(() => void fetchLeads(), 10000);
        }} />
      )}

      {toast && <Toast tone={toast.tone} message={toast.message} />}
      {loading && <p>Loading leads...</p>}
      {!loading && <LeadTableWidget leads={paged} page={page} totalPages={totalPages} onPageChange={setPage} />}
    </AppShell>
  );
}
