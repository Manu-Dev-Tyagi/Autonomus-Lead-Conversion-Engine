"use client";

import { useEffect, useState } from "react";

import {
  createAdminWorkspace,
  listAdminWorkspaces,
  WorkspaceSummary,
} from "@/lib/api/admin-workspaces";
import { AppShell } from "@/src/components/shared/AppShell";
import { Toast } from "@/src/components/shared/Toast";

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null,
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [saving, setSaving] = useState(false);

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
      title="Workspace Provisioning"
      subtitle="Create and manage client workspaces across all tenants."
      showAdminLinks
    >
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      <section className="ale-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Create Workspace</h2>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim() || !slug.trim() || !ownerUserId.trim()) {
              setToast({
                tone: "error",
                message: "name, slug, and owner user id are required.",
              });
              return;
            }
            setSaving(true);
            setError(null);
            try {
              const result = await createAdminWorkspace({
                name: name.trim(),
                slug: slug.trim().toLowerCase(),
                ownerUserId: ownerUserId.trim(),
                industry: industry.trim() || undefined,
                companySize: companySize.trim() || undefined,
                idempotencyKey: `workspace:${slug.trim().toLowerCase()}`,
              });
              setToast({
                tone: result.idempotentReplay ? "info" : "success",
                message: result.idempotentReplay
                  ? "Workspace already existed, returned previous result."
                  : "Workspace provisioned successfully.",
              });
              setName("");
              setSlug("");
              setOwnerUserId("");
              setIndustry("");
              setCompanySize("");
              await load();
            } catch (createError) {
              setError(
                createError instanceof Error
                  ? createError.message
                  : "Failed to provision workspace.",
              );
              setToast({ tone: "error", message: "Workspace provisioning failed." });
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="ale-row">
            <label>
              Client Name
              <br />
              <input
                className="ale-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Inc."
              />
            </label>
            <label>
              Workspace Slug
              <br />
              <input
                className="ale-input"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="acme-inc"
              />
            </label>
            <label style={{ minWidth: 320 }}>
              Owner User ID (UUID)
              <br />
              <input
                className="ale-input"
                value={ownerUserId}
                onChange={(event) => setOwnerUserId(event.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </label>
            <label>
              Industry
              <br />
              <input
                className="ale-input"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="SaaS"
              />
            </label>
            <label>
              Company Size
              <br />
              <input
                className="ale-input"
                value={companySize}
                onChange={(event) => setCompanySize(event.target.value)}
                placeholder="51-200"
              />
            </label>
          </div>
          <button className="ale-button" type="submit" disabled={saving}>
            {saving ? "Provisioning..." : "Provision workspace"}
          </button>
        </form>
      </section>

      {loading ? <p>Loading workspaces...</p> : null}
      {!loading && (
        <table className="ale-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Tenant</th>
              <th>Owner</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((workspace) => (
              <tr key={workspace.id}>
                <td>{workspace.name}</td>
                <td>{workspace.slug}</td>
                <td>{workspace.status}</td>
                <td>{workspace.tenantId}</td>
                <td>{workspace.ownerUserId}</td>
                <td>{new Date(workspace.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {workspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="ale-muted">
                  No workspaces found yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
