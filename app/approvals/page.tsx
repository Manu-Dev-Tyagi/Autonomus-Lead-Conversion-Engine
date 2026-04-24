"use client";

import { useEffect, useMemo, useState } from "react";

import {
  approveDecision,
  listApprovals,
  rejectDecision,
} from "@/lib/api/approvals";
import { ApprovalItem } from "@/lib/types/api";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { Toast } from "@/src/components/shared/Toast";

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null,
  );
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState("");
  const [pendingReject, setPendingReject] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listApprovals();
      setItems(payload.data);
      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh]);
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        decisionFilter.trim()
          ? item.decision.action.toLowerCase().includes(decisionFilter.trim().toLowerCase())
          : true,
      ),
    [items, decisionFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page],
  );

  return (
    <AppShell
      title="Approval Queue"
      subtitle="Review lower-confidence agent decisions before they execute."
    >
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Pending Reviews" value={items.length} />
        <KpiCard label="SLA Target" value="Within 2h" hint="Operational best practice." />
        <KpiCard
          label="Last Updated"
          value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "-"}
          hint={autoRefresh ? "Auto-refresh every 15s" : "Manual refresh mode"}
        />
      </section>

      {loading && <p>Loading approvals...</p>}
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <>
        {items.length === 0 ? (
          <section className="ale-card">
            <h3 style={{ marginTop: 0 }}>Queue is clear</h3>
            <p className="ale-muted">
              No pending approvals right now. Automation is running within policy thresholds.
            </p>
          </section>
        ) : (
          <>
          <div className="ale-toolbar" style={{ marginBottom: 10 }}>
            <div className="ale-row">
              <label>
                Decision filter{" "}
                <input
                  className="ale-input"
                  placeholder="e.g. SEND_EMAIL"
                  value={decisionFilter}
                  onChange={(event) => {
                    setDecisionFilter(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                />{" "}
                Auto-refresh
              </label>
              <button className="ale-button" onClick={() => void load()}>
                Refresh now
              </button>
            </div>
          </div>
          <div className="ale-pagination" style={{ marginBottom: 10 }}>
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
        <table className="ale-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Decision</th>
              <th>Confidence</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.lead.email}</td>
                <td>{item.decision.action}</td>
                <td>{item.decision.confidence ?? "-"}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  <div className="ale-row">
                    <button
                      className="ale-button"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await approveDecision(item.id);
                          setToast({ tone: "success", message: "Decision approved." });
                          await load();
                        } catch (approveError) {
                          setError(
                            approveError instanceof Error
                              ? approveError.message
                              : "Failed to approve decision.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="ale-button"
                      style={{ backgroundColor: "#ae2a19", borderColor: "#ae2a19" }}
                      disabled={busyId === item.id}
                      onClick={() => {
                        setPendingReject(item);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
        )}
        </>
      )}
      {pendingReject ? (
        <div className="ale-modal-backdrop">
          <div className="ale-modal">
            <h3 style={{ marginTop: 0 }}>Reject Decision</h3>
            <p className="ale-muted">
              Lead: {pendingReject.lead.email} · Action: {pendingReject.decision.action}
            </p>
            <label>
              Reason
              <br />
              <input
                className="ale-input"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Insufficient personalization"
              />
            </label>
            <div className="ale-row" style={{ marginTop: 12 }}>
              <button
                className="ale-button"
                style={{ backgroundColor: "#ae2a19", borderColor: "#ae2a19" }}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    setError("Reject reason is required.");
                    return;
                  }
                  setBusyId(pendingReject.id);
                  try {
                    await rejectDecision(pendingReject.id, { reason: rejectReason.trim() });
                    setToast({ tone: "info", message: "Decision rejected." });
                    setPendingReject(null);
                    await load();
                  } catch (rejectError) {
                    setError(
                      rejectError instanceof Error
                        ? rejectError.message
                        : "Failed to reject decision.",
                    );
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Confirm reject
              </button>
              <button className="ale-button" onClick={() => setPendingReject(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
