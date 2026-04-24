import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { getAppContainer } from "@/src/core/infrastructure/ioc/bootstrap";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";

export default async function OperationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const activeTenant = (user.app_metadata?.tenant_id as string | undefined) ?? "";
  if (!activeTenant) {
    return (
      <main style={{ maxWidth: 760, margin: "48px auto", padding: 16 }}>
        <h1>Operations Dashboard</h1>
        <p>Set an active tenant claim before viewing operations metrics.</p>
        <p>
          Use <Link href="/admin/tenant-claims">tenant claim admin</Link>.
        </p>
      </main>
    );
  }

  const container = getAppContainer();
  const metricsPort = container.resolve<TenantOpsMetricsPort>(IoCTokens.TenantOpsMetrics);
  const metrics = await metricsPort.getByTenant(activeTenant);
  const total = metrics.successCount + metrics.failureCount;
  const successRate = total > 0 ? ((metrics.successCount / total) * 100).toFixed(2) : "0.00";

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 16 }}>
      <h1>Operations Dashboard</h1>
      <p>Tenant: {metrics.tenantId}</p>
      <p>Completed runs: {metrics.successCount}</p>
      <p>Failed runs: {metrics.failureCount}</p>
      <p>Success rate: {successRate}%</p>

      <p style={{ marginTop: 24 }}>
        Back to <Link href="/">workspace</Link>.
      </p>
    </main>
  );
}
