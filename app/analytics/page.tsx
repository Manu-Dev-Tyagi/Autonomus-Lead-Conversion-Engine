"use client";

import { useEffect, useMemo, useState } from "react";

import { getFunnelMetrics } from "@/lib/api/analytics";
import { FunnelMetricsResponse } from "@/lib/types/api";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";

export default function AnalyticsPage() {
  const [data, setData] = useState<FunnelMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await getFunnelMetrics();
        if (mounted) {
          setData(payload);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
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
  }, []);

  const stateRows = useMemo(
    () => (data ? Object.entries(data.byState).sort((a, b) => b[1] - a[1]) : []),
    [data],
  );

  return (
    <AppShell
      title="Analytics & Funnel Insights"
      subtitle="Monitor qualification, reply, booking, and conversion health."
    >
      {loading && <p>Loading analytics...</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && data && (
        <>
          {data.metrics.totalLeads === 0 ? (
            <section className="ale-card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>No funnel data yet</h3>
              <p className="ale-muted">
                Add leads or connect inbound sources to start seeing conversion analytics.
              </p>
            </section>
          ) : null}
          <section className="ale-row" style={{ marginBottom: 16 }}>
            <KpiCard label="Total Leads" value={data.metrics.totalLeads} />
            <KpiCard label="Qualification Rate" value={`${(data.metrics.qualificationRate * 100).toFixed(1)}%`} />
            <KpiCard label="Reply Rate" value={`${(data.metrics.replyRate * 100).toFixed(1)}%`} />
            <KpiCard label="Booking Rate" value={`${(data.metrics.bookingRate * 100).toFixed(1)}%`} />
            <KpiCard label="Conversion Rate" value={`${(data.metrics.conversionRate * 100).toFixed(1)}%`} />
          </section>

          <section className="ale-card">
            <h2 style={{ marginTop: 0 }}>Pipeline by State</h2>
            <table className="ale-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stateRows.map(([state, count]) => (
                  <tr key={state}>
                    <td>{state}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </AppShell>
  );
}
