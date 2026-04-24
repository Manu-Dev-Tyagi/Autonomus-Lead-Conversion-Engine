"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createLead, listLeads } from "@/lib/api/leads";
import { LeadListItem, LeadState } from "@/lib/types/api";
import { LeadScoreIndicator } from "@/src/components/leads/LeadScoreIndicator";
import { LeadStateBadge } from "@/src/components/leads/LeadStateBadge";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { Toast } from "@/src/components/shared/Toast";

const FILTER_STATES: Array<LeadState | "all"> = [
  "all",
  "new",
  "qualified",
  "disqualified",
  "outreach",
  "replied",
  "booked",
  "converted",
  "lost",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<LeadState | "all">("all");
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<"createdAt" | "score" | "email">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await listLeads({
          page: 1,
          pageSize: 50,
          state: stateFilter === "all" ? undefined : stateFilter,
          search: search.trim() || undefined,
        });
        if (mounted) {
          setLeads(payload.data);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load leads.");
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
  }, [stateFilter, search]);

  const hasLeads = useMemo(() => leads.length > 0, [leads.length]);
  const sortedLeads = useMemo(() => {
    const copy = [...leads];
    copy.sort((left, right) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortBy === "createdAt") {
        return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * direction;
      }
      if (sortBy === "score") {
        return ((left.score ?? -1) - (right.score ?? -1)) * direction;
      }
      return left.email.localeCompare(right.email) * direction;
    });
    return copy;
  }, [leads, sortBy, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const pagedLeads = useMemo(
    () => sortedLeads.slice((page - 1) * pageSize, page * pageSize),
    [sortedLeads, page],
  );
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const qualifiedCount = useMemo(
    () => leads.filter((lead) => lead.state === "qualified").length,
    [leads],
  );
  const repliedCount = useMemo(
    () => leads.filter((lead) => lead.state === "replied").length,
    [leads],
  );

  return (
    <AppShell
      title="Lead Management"
      subtitle="Track pipeline progression, enrich records, and qualify opportunities."
    >
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Visible Leads" value={leads.length} />
        <KpiCard label="Qualified" value={qualifiedCount} />
        <KpiCard label="Replied" value={repliedCount} />
      </section>

      <section className="ale-row" style={{ marginBottom: 16 }}>
        <label>
          State{" "}
          <select
            className="ale-select"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as LeadState | "all")}
          >
            {FILTER_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search email{" "}
          <input
            className="ale-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="name@company.com"
          />
        </label>
      </section>
      <section className="ale-card" style={{ marginBottom: 16 }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newEmail.trim()) {
              return;
            }
            setCreating(true);
            setError(null);
            try {
              await createLead({ email: newEmail.trim() });
              setNewEmail("");
              setToast({ tone: "success", message: "Lead created successfully." });
              const refreshed = await listLeads({
                page: 1,
                pageSize: 50,
                state: stateFilter === "all" ? undefined : stateFilter,
                search: search.trim() || undefined,
              });
              setLeads(refreshed.data);
            } catch (createError) {
              setError(createError instanceof Error ? createError.message : "Failed to create lead.");
              setToast({ tone: "error", message: "Lead creation failed." });
            } finally {
              setCreating(false);
            }
          }}
        >
          <label>
            New lead email{" "}
            <input
              className="ale-input"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="new.lead@company.com"
            />
          </label>{" "}
          <button className="ale-button" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create lead"}
          </button>
        </form>
      </section>

      {loading && <p>Loading leads...</p>}
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && !hasLeads && (
        <section className="ale-card">
          <h3 style={{ marginTop: 0 }}>No leads yet</h3>
          <p className="ale-muted">
            Start by adding your first lead, or connect a webhook source for automatic intake.
          </p>
        </section>
      )}

      {!loading && !error && hasLeads && (
        <>
          <section className="ale-toolbar" style={{ marginBottom: 10 }}>
            <div className="ale-row">
              <label>
                Sort by{" "}
                <select
                  className="ale-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "createdAt" | "score" | "email")}
                >
                  <option value="createdAt">Created date</option>
                  <option value="score">Score</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                Direction{" "}
                <select
                  className="ale-select"
                  value={sortDir}
                  onChange={(event) => setSortDir(event.target.value as "asc" | "desc")}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
            </div>
            <div className="ale-pagination">
              <button className="ale-button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <span className="ale-muted">
                Page {page} of {totalPages}
              </span>
              <button className="ale-button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </section>
          <table className="ale-table">
            <thead>
              <tr>
                <th align="left">Email</th>
                <th align="left">State</th>
                <th align="left">Score</th>
                <th align="left">Created</th>
                <th align="left">Details</th>
              </tr>
            </thead>
            <tbody>
              {pagedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.email}</td>
                  <td><LeadStateBadge state={lead.state} /></td>
                  <td><LeadScoreIndicator score={lead.score} /></td>
                  <td>{new Date(lead.createdAt).toLocaleString()}</td>
                  <td>
                    <Link href={`/leads/${lead.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </AppShell>
  );
}
