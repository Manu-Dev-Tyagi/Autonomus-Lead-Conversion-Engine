import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAppContainer } from "@/src/core/infrastructure/ioc/bootstrap";
import { IoCTokens } from "@/src/core/infrastructure/ioc/tokens";
import { CreateWorkspaceUseCase } from "@/src/core/application/use-cases/CreateWorkspaceUseCase";
import { WorkspaceRepositoryPort } from "@/src/core/application/ports/WorkspaceRepositoryPort";
import { WorkspaceId } from "@/src/core/domain/shared/ids";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";

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

  // 1. Resolve Use Case from IoC
  const container = getAppContainer();
  const useCase = container.resolve<CreateWorkspaceUseCase>(IoCTokens.CreateWorkspaceUseCase);

  // 2. Load Template
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

  try {
    // 3. Execute Use Case
    const result = await useCase.execute({
      name,
      slug,
      ownerUserId,
      idempotencyKey,
      industry: typeof body.industry === "string" ? body.industry : undefined,
      companySize: typeof body.companySize === "string" ? body.companySize : undefined,
      templateConfig: config
    });

    // 4. Fetch the created workspace for response (or just return IDs)
    const workspaceRepo = container.resolve<WorkspaceRepositoryPort>(IoCTokens.WorkspaceRepository);
    const workspace = await workspaceRepo.findById(new WorkspaceId(result.workspaceId));

    return NextResponse.json(
      {
        workspace: {
          id: workspace?.id.value,
          tenantId: workspace?.tenantId.value,
          name: workspace?.name,
          slug: workspace?.slug,
          status: workspace?.status,
          ownerUserId: workspace?.ownerUserId,
          createdAt: workspace?.createdAt.toISOString(),
        },
        jobId: result.jobId
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to create workspace: ${error.message}` },
      { status: 500 }
    );
  }
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
