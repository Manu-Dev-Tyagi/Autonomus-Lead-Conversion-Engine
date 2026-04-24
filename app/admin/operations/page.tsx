"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getOperationsMetrics } from "@/lib/api/operations";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { Toast } from "@/src/components/shared/Toast";

export default function OperationsPage() {
  const [metrics, setMetrics] = useState<{
    tenantId: string;
    successCount: number;
    failureCount: number;
    lastUpdatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getOperationsMetrics();
      setMetrics(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load metrics.");
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

  const total = (metrics?.successCount ?? 0) + (metrics?.failureCount ?? 0);
  const successRate =
    total > 0 ? (((metrics?.successCount ?? 0) / total) * 100).toFixed(2) : "0.00";

  return (
    <AppShell
      title="Operations Dashboard"
      subtitle={metrics ? `Tenant ${metrics.tenantId}` : "Track reliability and workflow success"}
      showAdminLinks
    >
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
      {loading ? <p>Loading operations metrics...</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <section className="ale-row">
        <KpiCard label="Completed Runs" value={metrics?.successCount ?? 0} />
        <KpiCard label="Failed Runs" value={metrics?.failureCount ?? 0} />
        <KpiCard label="Success Rate" value={`${successRate}%`} />
        <KpiCard
          label="Last Updated"
          value={metrics ? new Date(metrics.lastUpdatedAt).toLocaleTimeString() : "-"}
          hint={autoRefresh ? "Auto-refresh every 15s" : "Manual refresh mode"}
        />
      </section>
      <section className="ale-row" style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />{" "}
          Auto-refresh
        </label>
        <button
          className="ale-button"
          onClick={async () => {
            await load();
            setToast({ tone: "info", message: "Metrics refreshed." });
          }}
        >
          Refresh now
        </button>
      </section>
      <section className="ale-card" style={{ marginTop: 16 }}>
        <p>
          Need claim changes? <Link href="/admin/tenant-claims">Open tenant claim admin</Link>.
        </p>
      </section>
    </AppShell>
  );
}
