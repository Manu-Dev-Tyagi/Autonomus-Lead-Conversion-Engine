"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getLead, updateLead } from "@/lib/api/leads";
import { LeadDetailResponse, LeadState } from "@/lib/types/api";
import { LeadScoreIndicator } from "@/src/components/leads/LeadScoreIndicator";
import { LeadStateBadge } from "@/src/components/leads/LeadStateBadge";
import { LeadTimeline } from "@/src/components/leads/LeadTimeline";
import { AppShell } from "@/src/components/shared/AppShell";

type LeadTab = "overview" | "interactions" | "decisions";
const EDITABLE_STATES: LeadState[] = [
  "new",
  "qualified",
  "disqualified",
  "outreach",
  "replied",
  "booked",
  "converted",
  "lost",
];

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const [tab, setTab] = useState<LeadTab>("overview");
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!leadId) {
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await getLead(leadId);
        if (mounted) {
          setData(payload);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load lead.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [leadId]);

  const title = useMemo(() => data?.lead.email ?? "Lead detail", [data?.lead.email]);

  return (
    <AppShell
      title={title}
      subtitle="Review account timeline, AI decisions, and conversion readiness."
      actions={<Link href="/leads">Back to leads</Link>}
    >
      {loading && <p>Loading lead details...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && data && (
        <>
          <section className="ale-row" style={{ marginBottom: 16 }}>
            <button className="ale-button" type="button" onClick={() => setTab("overview")}>
              Overview
            </button>
            <button className="ale-button" type="button" onClick={() => setTab("interactions")}>
              Interactions
            </button>
            <button className="ale-button" type="button" onClick={() => setTab("decisions")}>
              Agent Decisions
            </button>
          </section>

          {tab === "overview" && (
            <section className="ale-card">
              <p>
                <strong>State:</strong> <LeadStateBadge state={data.lead.state} />
              </p>
              <p>
                <strong>Score:</strong> <LeadScoreIndicator score={data.lead.score} />
              </p>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const state = String(formData.get("state") ?? "");
                  if (!state || !EDITABLE_STATES.includes(state as LeadState)) {
                    setError("Invalid state selected.");
                    return;
                  }
                  setSaving(true);
                  setError(null);
                  try {
                    const updated = await updateLead(data.lead.id, { state: state as LeadState });
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            lead: updated.lead,
                          }
                        : prev,
                    );
                  } catch (updateError) {
                    setError(updateError instanceof Error ? updateError.message : "Failed to update state.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <label>
                  Update state{" "}
                  <select className="ale-select" name="state" defaultValue={data.lead.state}>
                    {EDITABLE_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>{" "}
                <button className="ale-button" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save state"}
                </button>
              </form>
              <p>
                <strong>Created:</strong> {new Date(data.lead.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Updated:</strong> {new Date(data.lead.updatedAt).toLocaleString()}
              </p>
            </section>
          )}

          {tab === "interactions" && (
            <section className="ale-card">
              <LeadTimeline interactions={data.interactions} />
            </section>
          )}

          {tab === "decisions" && (
            <section className="ale-card">
              {data.decisions.length === 0 ? (
                <p>No agent decisions recorded.</p>
              ) : (
                <ul>
                  {data.decisions.map((item) => (
                    <li key={item.id} style={{ marginBottom: 10 }}>
                      {item.action} ({item.confidence ?? "-"}): {item.reasoning}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
