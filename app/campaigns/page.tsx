"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CampaignRecord,
  createCampaign,
  listCampaigns,
} from "@/lib/api/campaigns";
import { AppShell } from "@/src/components/shared/AppShell";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { Toast } from "@/src/components/shared/Toast";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null,
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listCampaigns();
      setCampaigns(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  const totalPages = Math.max(1, Math.ceil(campaigns.length / pageSize));
  const pagedCampaigns = useMemo(
    () => campaigns.slice((page - 1) * pageSize, page * pageSize),
    [campaigns, page],
  );

  return (
    <AppShell
      title="Campaigns"
      subtitle="Create and monitor outreach programs for each market segment."
    >
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Total Campaigns" value={campaigns.length} />
        <KpiCard
          label="Draft Campaigns"
          value={campaigns.filter((campaign) => campaign.status === "draft").length}
        />
      </section>

      <section className="ale-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Create Campaign</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) {
              return;
            }
            setSaving(true);
            setError(null);
            try {
              await createCampaign({ name: name.trim(), description: description.trim() || undefined });
              setName("");
              setDescription("");
              setToast({ tone: "success", message: "Campaign created." });
              await load();
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : "Failed to create campaign.");
              setToast({ tone: "error", message: "Campaign creation failed." });
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="ale-row">
            <label>
              Name
              <br />
              <input
                className="ale-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Q2 Mid-Market Expansion"
              />
            </label>
            <label style={{ minWidth: 320 }}>
              Description
              <br />
              <input
                className="ale-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Target accounts with 3-touch personalized sequence."
              />
            </label>
          </div>
          <button className="ale-button" type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create campaign"}
          </button>
        </form>
      </section>

      {loading && <p>Loading campaigns...</p>}
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && (
        <>
          {campaigns.length === 0 ? (
            <section className="ale-card">
              <h3 style={{ marginTop: 0 }}>No campaigns yet</h3>
              <p className="ale-muted">
                Start with one campaign for a target segment, then iterate using funnel metrics.
              </p>
            </section>
          ) : (
            <>
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
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCampaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.name}</td>
                      <td>{campaign.status}</td>
                      <td>{new Date(campaign.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
