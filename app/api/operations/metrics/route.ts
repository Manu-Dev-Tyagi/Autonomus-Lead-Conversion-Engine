import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { TenantOpsMetricsPort } from "@/src/core/application/ports/TenantOpsMetricsPort";
import { getAppContainer } from "@/src/core/infrastructure/ioc/bootstrap";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (user.app_metadata?.tenant_id as string | undefined) ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant claim." }, { status: 403 });
  }

  const container = getAppContainer();
  const metricsPort = container.resolve<TenantOpsMetricsPort>(IoCTokens.TenantOpsMetrics);
  const metrics = await metricsPort.getByTenant(tenantId);
  return NextResponse.json({
    data: {
      ...metrics,
      lastUpdatedAt: new Date().toISOString(),
    },
  });
}
