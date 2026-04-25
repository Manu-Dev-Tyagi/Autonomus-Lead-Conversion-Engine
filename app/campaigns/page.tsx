"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/src/components/shared/AppShell";
import { Toast } from "@/src/components/shared/Toast";

const INDUSTRY_OPTIONS = ["Technology", "SaaS", "FinTech", "Healthcare", "E-commerce", "Education", "Manufacturing", "Consulting", "Real Estate"];
const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const TITLE_SUGGESTIONS = ["CEO", "CTO", "VP Engineering", "VP Sales", "VP Marketing", "Head of Growth", "Director", "Manager", "Founder"];

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  config: any;
  stats: any;
  createdAt: string;
}

interface SequenceStep {
  type: "email" | "wait" | "followup";
  delayDays: number;
  subject: string;
  bodyPrompt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  // Campaign form
  const [form, setForm] = useState({
    name: "",
    description: "",
    targetIndustries: [] as string[],
    targetCompanySizes: [] as string[],
    targetTitles: [] as string[],
    customTitle: "",
    targetLocations: "",
    minScore: 70,
    autoEnroll: false,
    confidenceThreshold: 0.75,
    approvalRequiredBelow: 0.70,
  });

  // Sequence steps
  const [steps, setSteps] = useState<SequenceStep[]>([
    { type: "email", delayDays: 0, subject: "", bodyPrompt: "Personalized intro referencing their role and company" },
    { type: "wait", delayDays: 2, subject: "", bodyPrompt: "" },
    { type: "email", delayDays: 0, subject: "", bodyPrompt: "Value proposition with relevant case study" },
    { type: "wait", delayDays: 3, subject: "", bodyPrompt: "" },
    { type: "email", delayDays: 0, subject: "", bodyPrompt: "Final follow-up with urgency and booking link" },
  ]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.data || []);
    } catch (err) {
      setError("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchCampaigns(); }, []);

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const addStep = (type: "email" | "wait") => {
    setSteps(s => [...s, {
      type,
      delayDays: type === "wait" ? 2 : 0,
      subject: "",
      bodyPrompt: type === "email" ? "" : "",
    }]);
  };

  const removeStep = (idx: number) => setSteps(s => s.filter((_, i) => i !== idx));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          config: {
            targeting: {
              industries: form.targetIndustries,
              companySizes: form.targetCompanySizes,
              titles: form.targetTitles,
              locations: form.targetLocations.split(",").map(l => l.trim()).filter(Boolean),
              minScore: form.minScore,
            },
            automation: {
              autoEnroll: form.autoEnroll,
              confidenceThreshold: form.confidenceThreshold,
              approvalRequiredBelow: form.approvalRequiredBelow,
            },
            sequence: steps,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setToast({ tone: "success", message: `Campaign "${form.name}" created!` });
      setShowCreate(false);
      setForm({ name: "", description: "", targetIndustries: [], targetCompanySizes: [],
        targetTitles: [], customTitle: "", targetLocations: "", minScore: 70,
        autoEnroll: false, confidenceThreshold: 0.75, approvalRequiredBelow: 0.70 });
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign.");
      setToast({ tone: "error", message: "Campaign creation failed." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell title="Campaigns" subtitle="Create targeted outreach campaigns with AI-powered email sequences.">
      {toast && <Toast tone={toast.tone} message={toast.message} />}

      <section className="ale-row" style={{ marginBottom: 16 }}>
        <button
          className="ale-button"
          style={{ marginLeft: "auto", background: "#6366f1", fontWeight: 600 }}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "✕ Close" : "＋ Create Campaign"}
        </button>
      </section>

      {/* Campaign Creation Wizard */}
      {showCreate && (
        <section className="ale-card" style={{ marginBottom: 16, borderLeft: "3px solid #6366f1" }}>
          <form onSubmit={handleCreate}>
            {/* SECTION 1: Basics */}
            <h3 style={{ marginTop: 0, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              📋 Campaign Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Campaign Name *</span>
                <input className="ale-input" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Q2 Enterprise Outreach" style={{ width: "100%" }} />
              </label>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Description</span>
                <input className="ale-input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Targeting Series A SaaS companies..." style={{ width: "100%" }} />
              </label>
            </div>

            {/* SECTION 2: ICP Targeting */}
            <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              🎯 ICP Targeting — Who should this campaign reach?
            </h3>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>Target Industries</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INDUSTRY_OPTIONS.map(ind => (
                  <button key={ind} type="button"
                    className="ale-button"
                    style={{
                      fontSize: 12, padding: "4px 10px",
                      background: form.targetIndustries.includes(ind) ? "#6366f1" : "rgba(255,255,255,0.05)",
                      border: form.targetIndustries.includes(ind) ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                    }}
                    onClick={() => setForm(f => ({ ...f, targetIndustries: toggleArrayItem(f.targetIndustries, ind) }))}>
                    {form.targetIndustries.includes(ind) ? "✓ " : ""}{ind}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>Target Company Size</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COMPANY_SIZE_OPTIONS.map(size => (
                  <button key={size} type="button"
                    className="ale-button"
                    style={{
                      fontSize: 12, padding: "4px 10px",
                      background: form.targetCompanySizes.includes(size) ? "#6366f1" : "rgba(255,255,255,0.05)",
                      border: form.targetCompanySizes.includes(size) ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                    }}
                    onClick={() => setForm(f => ({ ...f, targetCompanySizes: toggleArrayItem(f.targetCompanySizes, size) }))}>
                    {form.targetCompanySizes.includes(size) ? "✓ " : ""}{size}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>Target Job Titles</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {TITLE_SUGGESTIONS.map(title => (
                  <button key={title} type="button"
                    className="ale-button"
                    style={{
                      fontSize: 12, padding: "4px 10px",
                      background: form.targetTitles.includes(title) ? "#6366f1" : "rgba(255,255,255,0.05)",
                      border: form.targetTitles.includes(title) ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                    }}
                    onClick={() => setForm(f => ({ ...f, targetTitles: toggleArrayItem(f.targetTitles, title) }))}>
                    {form.targetTitles.includes(title) ? "✓ " : ""}{title}
                  </button>
                ))}
              </div>
              <div className="ale-row" style={{ gap: 8 }}>
                <input className="ale-input" value={form.customTitle}
                  onChange={e => setForm(f => ({ ...f, customTitle: e.target.value }))}
                  placeholder="Add custom title..." style={{ flex: 1 }} />
                <button type="button" className="ale-button" style={{ fontSize: 12 }}
                  onClick={() => {
                    if (form.customTitle.trim()) {
                      setForm(f => ({ ...f, targetTitles: [...f.targetTitles, f.customTitle.trim()], customTitle: "" }));
                    }
                  }}>
                  + Add
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Target Locations (comma-separated)</span>
                <input className="ale-input" value={form.targetLocations}
                  onChange={e => setForm(f => ({ ...f, targetLocations: e.target.value }))}
                  placeholder="US, UK, India, Singapore" style={{ width: "100%" }} />
              </label>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Minimum Lead Score (0-100)</span>
                <input className="ale-input" type="number" min={0} max={100}
                  value={form.minScore}
                  onChange={e => setForm(f => ({ ...f, minScore: Number(e.target.value) }))}
                  style={{ width: "100%" }} />
              </label>
            </div>

            {/* SECTION 3: Automation */}
            <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              ⚙️ Automation Settings
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.autoEnroll}
                  onChange={e => setForm(f => ({ ...f, autoEnroll: e.target.checked }))} />
                <span style={{ fontSize: 13 }}>Auto-enroll matching qualified leads</span>
              </label>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Auto-send above confidence</span>
                <input className="ale-input" type="number" min={0} max={1} step={0.05}
                  value={form.confidenceThreshold}
                  onChange={e => setForm(f => ({ ...f, confidenceThreshold: Number(e.target.value) }))}
                  style={{ width: "100%" }} />
              </label>
              <label>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Require approval below</span>
                <input className="ale-input" type="number" min={0} max={1} step={0.05}
                  value={form.approvalRequiredBelow}
                  onChange={e => setForm(f => ({ ...f, approvalRequiredBelow: Number(e.target.value) }))}
                  style={{ width: "100%" }} />
              </label>
            </div>

            {/* SECTION 4: Email Sequence */}
            <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8 }}>
              📧 Email Sequence — Define your outreach touchpoints
            </h3>
            <div style={{ marginBottom: 16 }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: 12, marginBottom: 6, borderRadius: 8,
                  background: step.type === "wait" ? "rgba(245, 158, 11, 0.05)" : "rgba(99, 102, 241, 0.05)",
                  border: `1px solid ${step.type === "wait" ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)"}`,
                }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                    background: step.type === "wait" ? "#f59e0b" : "#6366f1", color: "white",
                  }}>
                    {idx + 1}
                  </div>
                  
                  {step.type === "wait" ? (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>⏳ Wait</span>
                      <input className="ale-input" type="number" min={1} max={30}
                        value={step.delayDays}
                        onChange={e => {
                          const updated = [...steps];
                          updated[idx] = { ...step, delayDays: Number(e.target.value) };
                          setSteps(updated);
                        }}
                        style={{ width: 60, marginLeft: 8 }} />
                      <span style={{ fontSize: 13, marginLeft: 4 }}>days</span>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>Subject Line (AI will personalize)</span>
                        <input className="ale-input" value={step.subject}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx] = { ...step, subject: e.target.value };
                            setSteps(updated);
                          }}
                          placeholder="Quick question about {{company}}'s {{painPoint}}"
                          style={{ width: "100%" }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>Body Prompt (direction for AI composer)</span>
                        <textarea className="ale-input" value={step.bodyPrompt}
                          onChange={e => {
                            const updated = [...steps];
                            updated[idx] = { ...step, bodyPrompt: e.target.value };
                            setSteps(updated);
                          }}
                          placeholder="Personalized intro referencing their role and recent company news..."
                          rows={2} style={{ width: "100%", resize: "vertical" }} />
                      </div>
                    </div>
                  )}
                  
                  <button type="button" className="ale-button" style={{ fontSize: 11, padding: "4px 8px", opacity: 0.5 }}
                    onClick={() => removeStep(idx)}>✕</button>
                </div>
              ))}
              <div className="ale-row" style={{ gap: 8, marginTop: 8 }}>
                <button type="button" className="ale-button" style={{ fontSize: 12 }}
                  onClick={() => addStep("email")}>+ Add Email Touch</button>
                <button type="button" className="ale-button" style={{ fontSize: 12 }}
                  onClick={() => addStep("wait")}>+ Add Wait Period</button>
              </div>
            </div>

            {/* Submit */}
            <div className="ale-row" style={{ gap: 12 }}>
              <button className="ale-button" type="submit" disabled={creating}
                style={{ background: "#6366f1", fontWeight: 600, padding: "10px 24px" }}>
                {creating ? "Creating..." : "🚀 Create Campaign"}
              </button>
              <span style={{ fontSize: 12, opacity: 0.5 }}>
                {form.targetIndustries.length > 0 || form.targetTitles.length > 0
                  ? `Targeting: ${[...form.targetIndustries, ...form.targetTitles].join(", ")}`
                  : "No targeting criteria set — campaign will match all qualified leads"}
              </span>
            </div>
          </form>
        </section>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading && <p>Loading campaigns...</p>}

      {/* Campaign List */}
      {!loading && campaigns.length === 0 && !showCreate && (
        <section className="ale-card" style={{ textAlign: "center", padding: 48 }}>
          <h3>No campaigns yet</h3>
          <p className="ale-muted">Create your first outreach campaign with ICP targeting and AI-powered email sequences.</p>
          <button className="ale-button" style={{ background: "#6366f1", fontWeight: 600 }}
            onClick={() => setShowCreate(true)}>
            🚀 Create Your First Campaign
          </button>
        </section>
      )}

      {!loading && campaigns.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {campaigns.map(c => (
            <section key={c.id} className="ale-card" style={{ borderLeft: `3px solid ${
              c.status === "active" ? "#10b981" : c.status === "paused" ? "#f59e0b" : "#666"
            }` }}>
              <div className="ale-row" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{c.name}</h3>
                <span style={{
                  marginLeft: 12, padding: "2px 8px", fontSize: 11, borderRadius: 4,
                  background: c.status === "active" ? "#10b981" : c.status === "paused" ? "#f59e0b" : "#444",
                  color: "white", fontWeight: 600,
                }}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              
              {c.description && <p style={{ margin: "0 0 8px", opacity: 0.7, fontSize: 14 }}>{c.description}</p>}
              
              {c.config?.targeting && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                  {(c.config.targeting.industries || []).map((ind: string) => (
                    <span key={ind} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 3, background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                      {ind}
                    </span>
                  ))}
                  {(c.config.targeting.titles || []).map((t: string) => (
                    <span key={t} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 3, background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>
                      {t}
                    </span>
                  ))}
                  {(c.config.targeting.companySizes || []).map((s: string) => (
                    <span key={s} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 3, background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                      {s} employees
                    </span>
                  ))}
                </div>
              )}
              
              {c.config?.sequence && (
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  {c.config.sequence.filter((s: any) => s.type === "email").length} email touches · 
                  {c.config.sequence.filter((s: any) => s.type === "wait").reduce((sum: number, s: any) => sum + (s.delayDays || 0), 0)} days total span
                </div>
              )}
              
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                Created {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
