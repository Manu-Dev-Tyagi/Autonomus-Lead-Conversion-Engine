"use client";

import { useEffect, useState } from "react";

import {
  createAdminWorkspace,
  listAdminWorkspaces,
  WorkspaceSummary,
} from "@/lib/api/admin-workspaces";
import { AppShell } from "@/src/components/shared/AppShell";
import { Toast } from "@/src/components/shared/Toast";

import Link from "next/link";

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listAdminWorkspaces();
      setWorkspaces(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell
      title="Workspaces"
      subtitle="Total control over client environments and provisioning status."
      showAdminLinks
      actions={
        <Link href="/admin/workspaces/new">
          <button className="ale-button" style={{ background: "#0052cc", borderColor: "#0052cc" }}>
            + Provision New Workspace
          </button>
        </Link>
      }
    >
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <div className="workspace-stats ale-row" style={{ marginBottom: 24, gap: 16 }}>
        <div className="ale-card" style={{ flex: 1, textAlign: "center" }}>
          <div className="ale-muted" style={{ fontSize: 12 }}>Active</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {workspaces.filter(w => w.status === "active").length}
          </div>
        </div>
        <div className="ale-card" style={{ flex: 1, textAlign: "center" }}>
          <div className="ale-muted" style={{ fontSize: 12 }}>Provisioning</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {workspaces.filter(w => w.status === "provisioning").length}
          </div>
        </div>
        <div className="ale-card" style={{ flex: 1, textAlign: "center" }}>
          <div className="ale-muted" style={{ fontSize: 12 }}>Failed</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>
            {workspaces.filter(w => w.status === "failed").length}
          </div>
        </div>
      </div>

      {loading ? <p>Loading workspaces...</p> : null}
      {!loading && (
        <div className="ale-card" style={{ padding: 0 }}>
          <table className="ale-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Status</th>
                <th>Owner ID</th>
                <th>Industry</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((workspace) => (
                <tr key={workspace.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{workspace.name}</div>
                    <div className="ale-muted" style={{ fontSize: 12 }}>ale.app/{workspace.slug}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${workspace.status}`}>
                      {workspace.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, fontFamily: "monospace" }}>{workspace.ownerUserId}</td>
                  <td>{workspace.industry || "—"}</td>
                  <td>{new Date(workspace.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="ale-button" style={{ padding: "4px 8px", fontSize: 12 }}>
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
              {workspaces.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40 }} className="ale-muted">
                    No workspaces found. Get started by provisioning your first client.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .status-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-badge.active { background: rgba(54, 179, 126, 0.1); color: #36b37e; }
        .status-badge.provisioning { background: rgba(0, 82, 204, 0.1); color: #0052cc; }
        .status-badge.failed { background: rgba(255, 86, 48, 0.1); color: #ff5630; }
      `}</style>
    </AppShell>
  );
}
