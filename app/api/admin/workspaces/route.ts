import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

interface WorkspaceRow {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: "provisioning" | "active" | "suspended" | "archived" | "failed";
  industry: string | null;
  company_size: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, tenant_id, name, slug, status, industry, company_size, owner_user_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: `Failed to list workspaces: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    data: ((data ?? []) as WorkspaceRow[]).map((workspace) => ({
      id: workspace.id,
      tenantId: workspace.tenant_id,
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      industry: workspace.industry,
      companySize: workspace.company_size,
      ownerUserId: workspace.owner_user_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    slug?: unknown;
    ownerUserId?: unknown;
    industry?: unknown;
    companySize?: unknown;
    idempotencyKey?: unknown;
    configOverrides?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const ownerUserId = typeof body.ownerUserId === "string" ? body.ownerUserId.trim() : "";
  if (!name || !slug || !ownerUserId) {
    return NextResponse.json(
      { error: "name, slug, and ownerUserId are required." },
      { status: 400 },
    );
  }

  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : `workspace:${slug}`;

  const admin = getAdminClient();
  const { data: existingJob, error: existingJobError } = await admin
    .from("workspace_provisioning_jobs")
    .select("id, workspace_id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingJobError) {
    return NextResponse.json(
      { error: `Failed to check idempotency: ${existingJobError.message}` },
      { status: 500 },
    );
  }
  if (existingJob?.workspace_id) {
    const { data: existingWorkspace, error: existingWorkspaceError } = await admin
      .from("workspaces")
      .select("id, tenant_id, name, slug, status, industry, company_size, owner_user_id, created_at, updated_at")
      .eq("id", existingJob.workspace_id)
      .maybeSingle();
    if (existingWorkspaceError) {
      return NextResponse.json(
        { error: `Failed to read existing workspace: ${existingWorkspaceError.message}` },
        { status: 500 },
      );
    }
    if (existingWorkspace) {
      const workspace = existingWorkspace as WorkspaceRow;
      return NextResponse.json(
        {
          workspace: {
            id: workspace.id,
            tenantId: workspace.tenant_id,
            name: workspace.name,
            slug: workspace.slug,
            status: workspace.status,
            industry: workspace.industry,
            companySize: workspace.company_size,
            ownerUserId: workspace.owner_user_id,
            createdAt: workspace.created_at,
            updatedAt: workspace.updated_at,
          },
          idempotentReplay: true,
        },
        { status: 200 },
      );
    }
  }

  const templatePath = resolve(
    process.cwd(),
    "config/workspace-templates/default-workspace.template.json",
  );
  const templateRaw = await readFile(templatePath, "utf8");
  const template = JSON.parse(templateRaw) as Record<string, unknown>;
  const configOverrides =
    typeof body.configOverrides === "object" && body.configOverrides
      ? (body.configOverrides as Record<string, unknown>)
      : {};
  const config = { ...template, ...configOverrides };

  const tenantId = crypto.randomUUID();
  const workspaceId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: tenantError } = await admin.from("tenants").insert({
    id: tenantId,
    name,
    slug,
    created_at: now,
    updated_at: now,
  });
  if (tenantError) {
    return NextResponse.json({ error: `Failed to create tenant: ${tenantError.message}` }, { status: 500 });
  }

  const { error: workspaceError } = await admin.from("workspaces").insert({
    id: workspaceId,
    tenant_id: tenantId,
    name,
    slug,
    status: "active",
    industry: typeof body.industry === "string" ? body.industry : null,
    company_size: typeof body.companySize === "string" ? body.companySize : null,
    owner_user_id: ownerUserId,
    created_at: now,
    updated_at: now,
  });
  if (workspaceError) {
    return NextResponse.json(
      { error: `Failed to create workspace: ${workspaceError.message}` },
      { status: 500 },
    );
  }

  const { error: membershipError } = await admin.from("tenant_memberships").insert({
    tenant_id: tenantId,
    user_id: ownerUserId,
    role: "owner",
    created_at: now,
  });
  if (membershipError) {
    return NextResponse.json(
      { error: `Failed to create owner membership: ${membershipError.message}` },
      { status: 500 },
    );
  }

  const { error: configError } = await admin.from("workspace_configs").insert({
    workspace_id: workspaceId,
    version: 1,
    config,
    is_active: true,
    created_by: auth.userId,
    created_at: now,
  });
  if (configError) {
    return NextResponse.json(
      { error: `Failed to create workspace config: ${configError.message}` },
      { status: 500 },
    );
  }

  const { error: jobError } = await admin.from("workspace_provisioning_jobs").insert({
    workspace_id: workspaceId,
    idempotency_key: idempotencyKey,
    status: "completed",
    step: "bootstrap_complete",
    attempt_count: 1,
    started_at: now,
    completed_at: now,
    created_at: now,
  });
  if (jobError) {
    return NextResponse.json(
      { error: `Failed to write provisioning job: ${jobError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      workspace: {
        id: workspaceId,
        tenantId,
        name,
        slug,
        status: "active",
        ownerUserId,
        createdAt: now,
      },
    },
    { status: 201 },
  );
}

async function requirePlatformAdmin(): Promise<
  | { userId: string }
  | { error: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const platformRole = user.app_metadata?.platform_role;
  if (platformRole !== "platform_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: user.id };
}
