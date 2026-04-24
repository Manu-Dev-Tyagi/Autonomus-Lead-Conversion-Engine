import { cookies } from "next/headers";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { KpiCard } from "@/src/components/shared/KpiCard";
import { AppShell } from "@/src/components/shared/AppShell";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="ale-container">
        <h1>Welcome to ALE</h1>
        <p className="ale-muted">Sign in to access your tenant workspace.</p>
        <Link href="/auth/sign-in">Go to sign in</Link>
      </div>
    );
  }

  const { data: todos, error } = await supabase
    .from("todos")
    .select("id, name")
    .order("created_at", { ascending: false });

  const activeTenant = (user.app_metadata?.tenant_id as string | undefined) ?? "";
  const role = (user.app_metadata?.role as string | undefined) ?? "";
  const isAdmin = role === "admin" || role === "owner";

  if (error) {
    return <p>Failed to load todos.</p>;
  }

  return (
    <AppShell
      title="Revenue Workspace"
      subtitle={`Signed in as ${user.email ?? "user"}${activeTenant ? ` · Tenant ${activeTenant}` : ""}`}
      showAdminLinks={isAdmin}
      actions={
        <form action={signOut}>
          <button className="ale-button" type="submit">
            Sign out
          </button>
        </form>
      }
    >
      <section className="ale-row" style={{ marginBottom: 16 }}>
        <KpiCard label="Pipeline Items" value={todos?.length ?? 0} hint="Seeded from tenant todo list." />
        <KpiCard label="Open Approvals" value={<Link href="/approvals">Review queue</Link>} />
        <KpiCard label="Leads Hub" value={<Link href="/leads">Open leads workspace</Link>} />
      </section>

      <section className="ale-card">
        <h2 style={{ marginTop: 0 }}>Workspace Shortcuts</h2>
        <ul>
          <li>
            <Link href="/leads">Lead management</Link> for qualification and follow-up.
          </li>
          <li>
            <Link href="/campaigns">Campaigns</Link> for sequence planning.
          </li>
          <li>
            <Link href="/analytics">Analytics</Link> for funnel conversion tracking.
          </li>
          <li>
            <Link href="/admin/operations">Operations</Link> for tenant reliability metrics.
          </li>
          <li>
            <Link href="/admin/tenant-claims">Tenant claim admin</Link> for privileged account controls.
          </li>
        </ul>
      </section>
    </AppShell>
  );
}
